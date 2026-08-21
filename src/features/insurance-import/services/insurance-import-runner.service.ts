import { supabase } from '@/lib/supabase'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { isInsuranceRegistryRow } from '@/features/connectors/services/registry-module-routing.service'
import { listInsuranceSourceAssignments } from '@/features/family/services/insurance-sources.service'
import { invalidateInsuranceKnowledgeCache } from '@/features/insurance-knowledge/services/insurance-knowledge-cache'
import { runInsuranceDiscovery } from '@/features/insurance-import/services/insurance-discovery-engine.service'
import {
	buildInsuranceMaterializationPlan,
	summarizeMaterializationPlan,
	type InsuranceMaterializationPlanRow,
} from '@/features/insurance-import/services/insurance-materialization.service'
import {
	createInsuranceDocumentFromRegistry,
	processInsuranceDocument,
	reprocessStuckInsuranceDocuments,
} from '@/features/insurance-import/services/insurance-processing.service'
import { resolveInsuranceCategoryHint } from '@/features/insurance/services/insurance-folder-discovery.service'
import {
	logInsuranceScanDiagnostics,
	buildInsuranceScanDiagnostics,
} from '@/features/insurance-import/services/insurance-scan-diagnostics.service'
import type { InsuranceImportStatusSnapshot } from '@/features/insurance-import/types/insurance-import.types'
import { invalidateInsuranceImportQueries } from '@/lib/query-invalidation'

export interface InsuranceMaterializationRunResult {
	plan: InsuranceMaterializationPlanRow[]
	summary: ReturnType<typeof summarizeMaterializationPlan>
	imported: number
	reprocessed: number
	failed: number
}

async function loadMaterializationPlan(userId: string) {
	const registry = await listRegistryRecords(userId, 'google-drive')
	const insuranceRows = registry.filter((row) => isInsuranceRegistryRow(row))

	const { data: documents } = await supabase
		.from('insurance_documents')
		.select('id, status, registry_id')
		.eq('user_id', userId)

	const documentsById = new Map<string, { status: string }>()

	for (const document of documents ?? []) {
		documentsById.set(document.id as string, {
			status: document.status as string,
		})
	}

	const plan = buildInsuranceMaterializationPlan({
		registryRows: insuranceRows,
		documentsById,
	})

	return {
		plan,
		summary: summarizeMaterializationPlan(plan),
		registryRows: insuranceRows,
		assignments: await listInsuranceSourceAssignments(userId),
	}
}

export async function planInsuranceMaterialization(
	userId: string,
): Promise<InsuranceMaterializationRunResult> {
	const { plan, summary } = await loadMaterializationPlan(userId)

	return {
		plan,
		summary,
		imported: 0,
		reprocessed: 0,
		failed: 0,
	}
}

async function importDiscoveredInsuranceFiles(userId: string): Promise<{
	imported: number
	failed: number
}> {
	const { plan, registryRows, assignments } =
		await loadMaterializationPlan(userId)
	const assignmentFolderIds = new Set(assignments.map((a) => a.folderId))
	const registryById = new Map(registryRows.map((row) => [row.id, row]))

	let imported = 0
	let failed = 0

	for (const planned of plan) {
		if (planned.action !== 'import_and_process') {
			continue
		}

		const row = registryById.get(planned.registryId)

		if (!row) {
			continue
		}

		if (row.folderId && !assignmentFolderIds.has(row.folderId)) {
			continue
		}

		const assignment =
			assignments.find((entry) => entry.folderId === row.folderId) ??
			assignments[0] ??
			null

		try {
			const documentId = await createInsuranceDocumentFromRegistry({
				userId,
				registryId: row.id,
				fileName: row.fileName,
				familyMemberId:
					row.familyMemberId ?? assignment?.familyMemberId ?? null,
				folderAssignmentId: assignment?.id ?? null,
			})

			await supabase
				.from('connector_document_registry')
				.update({
					insurance_document_id: documentId,
					target_module: 'insurance',
					import_status: 'completed',
					imported_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				})
				.eq('id', row.id)

			const categoryHint = resolveInsuranceCategoryHint({
				folderPath: row.folderPath,
				fileName: row.fileName,
			})

			await processInsuranceDocument({
				userId,
				documentId,
				fileName: row.fileName,
				familyMemberId:
					row.familyMemberId ?? assignment?.familyMemberId ?? null,
				categoryHint,
				folderPath: row.folderPath,
				registryId: row.id,
				externalFileId: row.externalFileId,
			})

			imported += 1
		} catch (error) {
			failed += 1

			await supabase
				.from('connector_document_registry')
				.update({
					import_status: 'failed',
					discovery_reason:
						error instanceof Error ? error.message : 'Insurance import failed',
					updated_at: new Date().toISOString(),
				})
				.eq('id', row.id)
		}
	}

	return { imported, failed }
}

export async function runInsuranceImportSync(
	userId: string,
	options?: { skipDiscovery?: boolean },
): Promise<{
	discovered: number
	imported: number
	failed: number
	plan: InsuranceMaterializationPlanRow[]
}> {
	if (!options?.skipDiscovery) {
		await runInsuranceDiscovery({ userId })
	}
	const { imported, failed } = await importDiscoveredInsuranceFiles(userId)
	const reprocess = await reprocessStuckInsuranceDocuments(userId)
	const { plan } = await loadMaterializationPlan(userId)

	if (import.meta.env.DEV) {
		logInsuranceScanDiagnostics(await buildInsuranceScanDiagnostics(userId))
	}

	invalidateInsuranceKnowledgeCache(userId)
	invalidateInsuranceImportQueries(userId)

	return {
		discovered: imported,
		imported,
		failed: failed + reprocess.failed,
		plan,
	}
}

export async function getInsuranceImportStatus(
	userId: string,
): Promise<InsuranceImportStatusSnapshot> {
	const { data: documents, error } = await supabase
		.from('insurance_documents')
		.select('status')
		.eq('user_id', userId)

	if (error) {
		if (error.message.includes('insurance_documents')) {
			return {
				isScanning: false,
				processingCount: 0,
				completedDocumentCount: 0,
				failedCount: 0,
				lastRun: null,
			}
		}

		throw new Error(error.message)
	}

	const rows = documents ?? []
	const processingCount = rows.filter((row) =>
		['uploaded', 'queued', 'processing', 'downloading'].includes(
			row.status as string,
		),
	).length
	const completedDocumentCount = rows.filter(
		(row) => row.status === 'completed',
	).length
	const failedCount = rows.filter(
		(row) => row.status === 'failed' || row.status === 'needs_review',
	).length

	const { data: latestRun } = await supabase
		.from('insurance_discovery_runs')
		.select('*')
		.eq('user_id', userId)
		.order('started_at', { ascending: false })
		.limit(1)
		.maybeSingle()

	return {
		isScanning: latestRun?.status === 'running',
		processingCount,
		completedDocumentCount,
		failedCount,
		lastRun: latestRun
			? {
					id: latestRun.id as string,
					status: latestRun.status as 'running' | 'completed' | 'failed',
					startedAt: latestRun.started_at as string,
					completedAt: (latestRun.completed_at as string | null) ?? null,
					foldersScanned: Number(latestRun.folders_scanned ?? 0),
					filesScanned: Number(latestRun.files_scanned ?? 0),
					documentCount: Number(latestRun.document_count ?? 0),
					duplicateCount: Number(latestRun.duplicate_count ?? 0),
					errorMessage: (latestRun.error_message as string | null) ?? null,
				}
			: null,
	}
}
