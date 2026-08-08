import { supabase } from '@/lib/supabase'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { listInsuranceSourceAssignments } from '@/features/family/services/insurance-sources.service'
import { invalidateInsuranceKnowledgeCache } from '@/features/insurance-knowledge/services/insurance-knowledge-cache'
import { runInsuranceDiscovery } from '@/features/insurance-import/services/insurance-discovery-engine.service'
import {
	createInsuranceDocumentFromRegistry,
	processInsuranceDocument,
} from '@/features/insurance-import/services/insurance-processing.service'
import type { InsuranceImportStatusSnapshot } from '@/features/insurance-import/types/insurance-import.types'
import { invalidateInsuranceImportQueries } from '@/lib/query-invalidation'

async function importDiscoveredInsuranceFiles(userId: string): Promise<number> {
	const assignments = await listInsuranceSourceAssignments(userId)
	const assignmentFolderIds = new Set(assignments.map((a) => a.folderId))
	const registry = await listRegistryRecords(userId, 'google-drive')

	const insuranceRows = registry.filter(
		(row) =>
			row.targetModule === 'insurance' ||
			row.discoveryCategory === 'insurance_policy',
	)

	let imported = 0

	for (const row of insuranceRows) {
		if (row.insuranceDocumentId) {
			continue
		}

		if (row.folderId && !assignmentFolderIds.has(row.folderId)) {
			continue
		}

		const assignment =
			assignments.find((entry) => entry.folderId === row.folderId) ??
			assignments[0] ??
			null

		const documentId = await createInsuranceDocumentFromRegistry({
			userId,
			registryId: row.id,
			fileName: row.fileName,
			familyMemberId: row.familyMemberId ?? assignment?.familyMemberId ?? null,
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

		const categoryHint = assignment?.discoveredCategories[0] ?? null

		await processInsuranceDocument({
			userId,
			documentId,
			fileName: row.fileName,
			familyMemberId: row.familyMemberId ?? assignment?.familyMemberId ?? null,
			categoryHint,
		})

		imported += 1
	}

	return imported
}

export async function runInsuranceImportSync(userId: string): Promise<{
	discovered: number
	imported: number
}> {
	await runInsuranceDiscovery({ userId })
	const imported = await importDiscoveredInsuranceFiles(userId)

	invalidateInsuranceKnowledgeCache(userId)
	invalidateInsuranceImportQueries(userId)

	return {
		discovered: imported,
		imported,
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
	const failedCount = rows.filter((row) => row.status === 'failed').length

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
