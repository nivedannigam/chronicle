import { supabase } from '@/lib/supabase'
import { listHealthSourceAssignments } from '@/features/family/services/health-sources.service'
import { queryKeys } from '@/lib/query-keys'

export interface FolderImportStatus {
	assignmentId: string
	folderId: string
	externalFolderId: string
	folderName: string
	memberLabel: string
	status: 'configured' | 'not_configured'
	filesFound: number
	documentsScanned: number
	medicalReports: number
	needsReview: number
	importCandidates: number
	lastScanAt: string | null
	nextScheduledScanAt: string | null
}

export interface HealthImportStatus {
	hasImportedReports: boolean
	completedReportsCount: number
	failedImportsCount: number
	filesFound: number
	documentsScanned: number
	medicalReportsCount: number
	needsReviewCount: number
	importCandidatesCount: number
	skippedIgnoredCount: number
	lastScanAt: string | null
	nextScheduledScanAt: string | null
	folders: FolderImportStatus[]
}

/** @deprecated No backend scheduler yet — always returns null */
function computeNextScheduledScan(): string | null {
	return null
}

function countByCategory(
	registry: Array<{ discovery_category: string | null }>,
	category: string,
) {
	return registry.filter((row) => row.discovery_category === category).length
}

export async function fetchHealthImportStatus(
	userId: string,
): Promise<HealthImportStatus> {
	const [assignments, registryResult, reportsResult, lastRunResult] =
		await Promise.all([
			listHealthSourceAssignments(userId),
			supabase
				.from('connector_document_registry')
				.select('folder_id, discovery_category, import_status')
				.eq('user_id', userId)
				.eq('connector_id', 'google-drive'),
			supabase
				.from('health_reports')
				.select('id, status')
				.eq('user_id', userId),
			supabase
				.from('health_discovery_runs')
				.select('completed_at, started_at')
				.eq('user_id', userId)
				.order('started_at', { ascending: false })
				.limit(1)
				.maybeSingle(),
		])

	if (registryResult.error) {
		throw new Error(registryResult.error.message)
	}

	if (reportsResult.error) {
		throw new Error(reportsResult.error.message)
	}

	const registry = registryResult.data ?? []
	const completedReports = (reportsResult.data ?? []).filter(
		(row) => row.status === 'completed',
	)
	const lastScanAt =
		(lastRunResult.data?.completed_at as string | null) ??
		(lastRunResult.data?.started_at as string | null) ??
		null

	const filesFound = registry.length
	const medicalReportsCount = countByCategory(registry, 'likely_medical')
	const needsReviewCount = countByCategory(registry, 'needs_review')
	const skippedIgnoredCount = countByCategory(registry, 'ignored')
	const importCandidatesCount = medicalReportsCount + needsReviewCount
	const documentsScanned = importCandidatesCount
	const failedImportsCount = registry.filter(
		(row) => row.import_status === 'failed',
	).length

	const folders: FolderImportStatus[] = assignments.map((assignment) => {
		const folderDocs = registry.filter(
			(row) => row.folder_id === assignment.folderId,
		)
		const folderMedical = countByCategory(folderDocs, 'likely_medical')
		const folderNeedsReview = countByCategory(folderDocs, 'needs_review')
		const folderCandidates = folderMedical + folderNeedsReview

		return {
			assignmentId: assignment.id,
			folderId: assignment.folderId,
			externalFolderId: assignment.externalFolderId,
			folderName: assignment.folderName,
			memberLabel: assignment.memberLabel,
			status: 'configured',
			filesFound: folderDocs.length,
			documentsScanned: folderCandidates,
			medicalReports: folderMedical,
			needsReview: folderNeedsReview,
			importCandidates: folderCandidates,
			lastScanAt,
			nextScheduledScanAt: computeNextScheduledScan(),
		}
	})

	return {
		hasImportedReports: completedReports.length > 0,
		completedReportsCount: completedReports.length,
		failedImportsCount,
		filesFound,
		documentsScanned,
		medicalReportsCount,
		needsReviewCount,
		importCandidatesCount,
		skippedIgnoredCount,
		lastScanAt,
		nextScheduledScanAt: computeNextScheduledScan(),
		folders,
	}
}

export function healthImportStatusQueryKey(userId: string | undefined) {
	return queryKeys.import.status(userId)
}
