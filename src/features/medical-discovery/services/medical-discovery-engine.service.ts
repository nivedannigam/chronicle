import { supabase } from '@/lib/supabase'
import { discoverDriveFiles } from '@/features/connectors/google-drive/services/google-drive-api.service'
import { findRegistryByExternalFileId } from '@/features/connectors/services/connector-store.service'
import { listHealthSourceAssignments } from '@/features/family/services/health-sources.service'
import { shouldPreserveImportStatus } from '@/features/health-import/services/duplicate-detection.service'
import { scoreMedicalFile } from '@/features/medical-discovery/services/medical-scoring.service'
import type {
	DiscoveryDashboardStats,
	DiscoveryRunMode,
	DiscoveryRunSummary,
	ScoredMedicalFile,
} from '@/features/medical-discovery/types/medical-discovery.types'

function mapDiscoveryRun(row: Record<string, unknown>): DiscoveryRunSummary {
	return {
		id: row.id as string,
		mode: row.mode as DiscoveryRunSummary['mode'],
		status: row.status as DiscoveryRunSummary['status'],
		startedAt: row.started_at as string,
		completedAt: (row.completed_at as string | null) ?? null,
		foldersScanned: Number(row.folders_scanned ?? 0),
		filesScanned: Number(row.files_scanned ?? 0),
		medicalCount: Number(row.medical_count ?? 0),
		reviewCount: Number(row.review_count ?? 0),
		ignoredCount: Number(row.ignored_count ?? 0),
		errorMessage: (row.error_message as string | null) ?? null,
	}
}

async function createDiscoveryRun(userId: string, mode: DiscoveryRunMode) {
	const { data, error } = await supabase
		.from('health_discovery_runs')
		.insert({ user_id: userId, mode, status: 'running' })
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return mapDiscoveryRun(data as Record<string, unknown>)
}

async function completeDiscoveryRun(
	runId: string,
	summary: Partial<DiscoveryRunSummary> & {
		status: DiscoveryRunSummary['status']
	},
) {
	const { error } = await supabase
		.from('health_discovery_runs')
		.update({
			status: summary.status,
			completed_at: new Date().toISOString(),
			folders_scanned: summary.foldersScanned,
			files_scanned: summary.filesScanned,
			medical_count: summary.medicalCount,
			review_count: summary.reviewCount,
			ignored_count: summary.ignoredCount,
			error_message: summary.errorMessage ?? null,
		})
		.eq('id', runId)

	if (error) {
		throw new Error(error.message)
	}
}

export async function runMedicalDiscovery(input: {
	userId: string
	mode?: DiscoveryRunMode
	folderIds?: string[]
	modifiedSince?: string | null
	onProgress?: (progress: { scanned: number; total: number }) => void
}): Promise<{
	run: DiscoveryRunSummary
	files: ScoredMedicalFile[]
}> {
	const mode = input.mode ?? 'manual'
	const assignments = await listHealthSourceAssignments(input.userId)
	const allFolderIds = [...new Set(assignments.map((a) => a.externalFolderId))]
	const folderIds =
		input.folderIds && input.folderIds.length > 0
			? input.folderIds.filter((id) => allFolderIds.includes(id))
			: allFolderIds

	if (folderIds.length === 0) {
		throw new Error(
			'No health folders configured. Assign folders in Health Sources first.',
		)
	}

	const run = await createDiscoveryRun(input.userId, mode)

	const membersByFolder = new Map<string, string[]>()

	for (const assignment of assignments) {
		const existing = membersByFolder.get(assignment.externalFolderId) ?? []
		membersByFolder.set(assignment.externalFolderId, [
			...existing,
			assignment.familyMemberId,
		])
	}

	try {
		const response = await discoverDriveFiles({
			userId: input.userId,
			folderIds,
			recursive: true,
			modifiedSince: input.modifiedSince ?? null,
		})

		const scoredFiles: ScoredMedicalFile[] = []
		let medicalCount = 0
		let reviewCount = 0
		let ignoredCount = 0

		const assignedFolderIds = new Set(folderIds)

		for (const [index, item] of response.items.entries()) {
			const score = scoreMedicalFile({
				fileName: item.fileName,
				mimeType: item.mimeType,
				folderPath: item.folderPath ?? item.folderExternalId,
				isAssignedHealthFolder: assignedFolderIds.has(item.folderExternalId),
			})

			const familyMemberIds = membersByFolder.get(item.folderExternalId) ?? []
			const primaryMemberId = familyMemberIds[0] ?? null

			const scored: ScoredMedicalFile = {
				fileId: item.externalFileId,
				name: item.fileName,
				mimeType: item.mimeType,
				modifiedTime: item.externalModifiedAt,
				size: item.fileSize,
				folderPath: item.folderPath ?? item.folderExternalId,
				folderExternalId: item.folderExternalId,
				confidence: score.confidence,
				reason: score.reason,
				category: score.category,
				familyMemberIds,
			}

			scoredFiles.push(scored)

			if (score.category === 'likely_medical') {
				medicalCount += 1
			} else if (score.category === 'needs_review') {
				reviewCount += 1
			} else {
				ignoredCount += 1
			}

			const assignment = assignments.find(
				(a) => a.externalFolderId === item.folderExternalId,
			)

			const existing = await findRegistryByExternalFileId(
				input.userId,
				'google-drive',
				item.externalFileId,
			)

			const approvalStatus =
				score.category === 'ignored'
					? 'rejected'
					: existing?.approvalStatus === 'approved'
						? 'approved'
						: 'pending'

			const upsertPayload: Record<string, unknown> = {
				user_id: input.userId,
				connector_id: 'google-drive',
				external_file_id: item.externalFileId,
				file_name: item.fileName,
				mime_type: item.mimeType,
				checksum: item.checksum,
				file_size: item.fileSize,
				external_created_at: item.externalCreatedAt,
				external_modified_at: item.externalModifiedAt,
				folder_id: assignment?.folderId ?? null,
				family_member_id: primaryMemberId,
				folder_path: item.folderPath ?? null,
				discovery_category: score.category,
				discovery_confidence: score.confidence,
				discovery_reason: score.reason,
				approval_status: approvalStatus,
				last_sync_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			}

			if (
				!existing ||
				(!shouldPreserveImportStatus(existing.importStatus) &&
					existing.importStatus !== 'skipped')
			) {
				upsertPayload.registry_status = 'discovered'
				upsertPayload.import_status = 'discovered'
			}

			await supabase.from('connector_document_registry').upsert(upsertPayload, {
				onConflict: 'user_id,connector_id,external_file_id',
			})

			input.onProgress?.({ scanned: index + 1, total: response.items.length })
		}

		await completeDiscoveryRun(run.id, {
			status: 'completed',
			foldersScanned: folderIds.length,
			filesScanned: scoredFiles.length,
			medicalCount,
			reviewCount,
			ignoredCount,
		})

		return {
			run: {
				...run,
				status: 'completed',
				completedAt: new Date().toISOString(),
				foldersScanned: folderIds.length,
				filesScanned: scoredFiles.length,
				medicalCount,
				reviewCount,
				ignoredCount,
			},
			files: scoredFiles,
		}
	} catch (error) {
		await completeDiscoveryRun(run.id, {
			status: 'failed',
			foldersScanned: folderIds.length,
			filesScanned: 0,
			medicalCount: 0,
			reviewCount: 0,
			ignoredCount: 0,
			errorMessage: error instanceof Error ? error.message : 'Discovery failed',
		})

		throw error
	}
}

export async function getDiscoveryDashboardStats(
	userId: string,
): Promise<DiscoveryDashboardStats> {
	const { data: registry, error } = await supabase
		.from('connector_document_registry')
		.select('discovery_category')
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')

	if (error) {
		throw new Error(error.message)
	}

	const rows = registry ?? []
	const { data: lastRun } = await supabase
		.from('health_discovery_runs')
		.select('*')
		.eq('user_id', userId)
		.order('started_at', { ascending: false })
		.limit(1)
		.maybeSingle()

	return {
		totalFiles: rows.length,
		medicalReports: rows.filter(
			(r) => r.discovery_category === 'likely_medical',
		).length,
		ignored: rows.filter((r) => r.discovery_category === 'ignored').length,
		needsReview: rows.filter((r) => r.discovery_category === 'needs_review')
			.length,
		lastScanAt:
			(lastRun?.completed_at as string | null) ??
			(lastRun?.started_at as string | null) ??
			null,
		foldersScanned: Number(lastRun?.folders_scanned ?? 0),
	}
}

export async function getLatestDiscoveryRun(
	userId: string,
): Promise<DiscoveryRunSummary | null> {
	const { data, error } = await supabase
		.from('health_discovery_runs')
		.select('*')
		.eq('user_id', userId)
		.order('started_at', { ascending: false })
		.limit(1)
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return data ? mapDiscoveryRun(data as Record<string, unknown>) : null
}

export async function listScoredDiscoveryFiles(
	userId: string,
	category?: string,
): Promise<ScoredMedicalFile[]> {
	let query = supabase
		.from('connector_document_registry')
		.select('*')
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')
		.order('discovery_confidence', { ascending: false })

	if (category && category !== 'all') {
		query = query.eq('discovery_category', category)
	}

	const { data, error } = await query

	if (error) {
		throw new Error(error.message)
	}

	return (data ?? []).map((row) => ({
		fileId: row.external_file_id as string,
		name: row.file_name as string,
		mimeType: row.mime_type as string,
		modifiedTime: (row.external_modified_at as string) ?? '',
		size: Number(row.file_size ?? 0),
		folderPath: (row.folder_path as string) ?? '',
		folderExternalId: '',
		confidence: Number(row.discovery_confidence ?? 0),
		reason: (row.discovery_reason as string) ?? '',
		category:
			(row.discovery_category as ScoredMedicalFile['category']) ?? 'ignored',
		familyMemberIds: row.family_member_id
			? [row.family_member_id as string]
			: [],
	}))
}
