import { supabase } from '@/lib/supabase'
import { discoverDriveFiles } from '@/features/connectors/google-drive/services/google-drive-api.service'
import {
	findRegistryByExternalFileId,
	upsertRegistryRecord,
} from '@/features/connectors/services/connector-store.service'
import { resolveModuleFolderAssignmentForFile } from '@/features/connectors/services/module-folder-assignment-resolver'
import { listInsuranceSourceAssignments } from '@/features/family/services/insurance-sources.service'
import { inferCategoryFromFolderPath } from '@/features/insurance/services/insurance-folder-discovery.service'
import type { InsuranceDiscoveryRunSummary } from '@/features/insurance-import/types/insurance-import.types'

const PDF_MIME = 'application/pdf'

function mapDiscoveryRun(
	row: Record<string, unknown>,
): InsuranceDiscoveryRunSummary {
	return {
		id: row.id as string,
		status: row.status as InsuranceDiscoveryRunSummary['status'],
		startedAt: row.started_at as string,
		completedAt: (row.completed_at as string | null) ?? null,
		foldersScanned: Number(row.folders_scanned ?? 0),
		filesScanned: Number(row.files_scanned ?? 0),
		documentCount: Number(row.document_count ?? 0),
		duplicateCount: Number(row.duplicate_count ?? 0),
		errorMessage: (row.error_message as string | null) ?? null,
	}
}

async function createDiscoveryRun(userId: string) {
	const { data, error } = await supabase
		.from('insurance_discovery_runs')
		.insert({
			user_id: userId,
			status: 'running',
		})
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return mapDiscoveryRun(data as Record<string, unknown>)
}

async function completeDiscoveryRun(
	runId: string,
	summary: Partial<InsuranceDiscoveryRunSummary> & {
		status: InsuranceDiscoveryRunSummary['status']
	},
) {
	const { error } = await supabase
		.from('insurance_discovery_runs')
		.update({
			status: summary.status,
			completed_at: new Date().toISOString(),
			folders_scanned: summary.foldersScanned,
			files_scanned: summary.filesScanned,
			document_count: summary.documentCount,
			duplicate_count: summary.duplicateCount,
			error_message: summary.errorMessage ?? null,
		})
		.eq('id', runId)

	if (error) {
		throw new Error(error.message)
	}
}

function inferCategoryFromPath(folderPath: string | null | undefined): string {
	return inferCategoryFromFolderPath(folderPath) ?? 'other'
}

export async function runInsuranceDiscovery(input: {
	userId: string
	modifiedSince?: string | null
}): Promise<{
	run: InsuranceDiscoveryRunSummary
	discoveredCount: number
}> {
	const assignments = await listInsuranceSourceAssignments(input.userId)
	const folderIds = [...new Set(assignments.map((a) => a.externalFolderId))]

	if (folderIds.length === 0) {
		throw new Error(
			'No insurance folders configured. Assign a folder in Insurance Settings first.',
		)
	}

	const run = await createDiscoveryRun(input.userId)

	try {
		const response = await discoverDriveFiles({
			userId: input.userId,
			folderIds,
			recursive: true,
			modifiedSince: input.modifiedSince ?? null,
		})

		let documentCount = 0
		let duplicateCount = 0

		for (const item of response.items) {
			if (item.mimeType !== PDF_MIME) {
				continue
			}

			const assignment = resolveModuleFolderAssignmentForFile(item, assignments)

			if (!assignment) {
				continue
			}

			const existing = await findRegistryByExternalFileId(
				input.userId,
				'google-drive',
				item.externalFileId,
			)

			if (
				existing?.targetModule === 'insurance' &&
				existing.checksum === item.checksum
			) {
				duplicateCount += 1
				continue
			}

			const categoryHint = inferCategoryFromPath(item.folderPath)

			await upsertRegistryRecord({
				userId: input.userId,
				connectorId: 'google-drive',
				externalFileId: item.externalFileId,
				fileName: item.fileName,
				mimeType: item.mimeType,
				checksum: item.checksum,
				fileSize: item.fileSize,
				externalCreatedAt: item.externalCreatedAt,
				externalModifiedAt: item.externalModifiedAt,
				folderId: assignment.folderId,
				familyMemberId: assignment.familyMemberId,
				folderPath: item.folderPath ?? null,
				discoveryCategory: 'insurance_policy',
				discoveryConfidence: 0.85,
				discoveryReason: `Insurance folder PDF (${categoryHint})`,
				approvalStatus: 'approved',
				targetModule: 'insurance',
			})

			documentCount += 1
		}

		await completeDiscoveryRun(run.id, {
			status: 'completed',
			foldersScanned: folderIds.length,
			filesScanned: response.items.length,
			documentCount,
			duplicateCount,
		})

		return {
			run: {
				...run,
				status: 'completed',
				foldersScanned: folderIds.length,
				filesScanned: response.items.length,
				documentCount,
				duplicateCount,
				completedAt: new Date().toISOString(),
			},
			discoveredCount: documentCount,
		}
	} catch (error) {
		await completeDiscoveryRun(run.id, {
			status: 'failed',
			foldersScanned: folderIds.length,
			filesScanned: 0,
			documentCount: 0,
			duplicateCount: 0,
			errorMessage:
				error instanceof Error ? error.message : 'Insurance discovery failed',
		})

		throw error
	}
}

export async function getLatestInsuranceDiscoveryRun(
	userId: string,
): Promise<InsuranceDiscoveryRunSummary | null> {
	const { data, error } = await supabase
		.from('insurance_discovery_runs')
		.select('*')
		.eq('user_id', userId)
		.order('started_at', { ascending: false })
		.limit(1)
		.maybeSingle()

	if (error) {
		if (error.message.includes('insurance_discovery_runs')) {
			return null
		}

		throw new Error(error.message)
	}

	return data ? mapDiscoveryRun(data as Record<string, unknown>) : null
}
