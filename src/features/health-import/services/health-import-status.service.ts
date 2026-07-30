import { listHealthSourceAssignments } from '@/features/family/services/health-sources.service'
import { getHealthWorkflowProjection } from '@/features/health/workflow'
import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'

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
	importingCount: number
	processingCount: number
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

function computeNextScheduledScan(): string | null {
	return null
}

function countWorkflowByCategory(
	items: Array<{ discoveryCategory: string | null; currentState: string }>,
	category: string,
) {
	return items.filter((item) => item.discoveryCategory === category).length
}

export async function fetchHealthImportStatus(
	userId: string,
): Promise<HealthImportStatus> {
	const [assignments, workflowProjection, lastRunResult] = await Promise.all([
		listHealthSourceAssignments(userId),
		getHealthWorkflowProjection(userId),
		supabase
			.from('health_discovery_runs')
			.select('completed_at, started_at, folders_scanned')
			.eq('user_id', userId)
			.order('started_at', { ascending: false })
			.limit(1)
			.maybeSingle(),
	])

	const items = workflowProjection.items
	const lastScanAt =
		(lastRunResult.data?.completed_at as string | null) ??
		(lastRunResult.data?.started_at as string | null) ??
		null

	const filesFound = items.filter(
		(item) =>
			item.currentState !== 'SKIPPED' && item.currentState !== 'REJECTED',
	).length
	const medicalReportsCount = countWorkflowByCategory(items, 'likely_medical')
	const needsReviewCount = workflowProjection.pendingReviewCount
	const skippedIgnoredCount = items.filter(
		(item) => item.currentState === 'SKIPPED',
	).length
	const importCandidatesCount =
		medicalReportsCount +
		items.filter((item) => item.currentState === 'PENDING_REVIEW').length
	const documentsScanned = importCandidatesCount + skippedIgnoredCount

	return {
		hasImportedReports: workflowProjection.readyCount > 0,
		completedReportsCount: workflowProjection.readyCount,
		failedImportsCount: workflowProjection.failedCount,
		importingCount: workflowProjection.importingCount,
		processingCount: workflowProjection.processingCount,
		filesFound,
		documentsScanned,
		medicalReportsCount,
		needsReviewCount,
		importCandidatesCount,
		skippedIgnoredCount,
		lastScanAt,
		nextScheduledScanAt: computeNextScheduledScan(),
		folders: assignments.map((assignment) => {
			const folderItems = items.filter(
				(item) =>
					item.metadata?.folderId === assignment.folderId ||
					item.familyMemberId === assignment.familyMemberId,
			)

			const folderMedical = countWorkflowByCategory(
				folderItems,
				'likely_medical',
			)
			const folderNeedsReview = folderItems.filter(
				(item) => item.currentState === 'PENDING_REVIEW',
			).length

			return {
				assignmentId: assignment.id,
				folderId: assignment.folderId,
				externalFolderId: assignment.externalFolderId,
				folderName: assignment.folderName,
				memberLabel: assignment.memberLabel,
				status: 'configured' as const,
				filesFound: folderItems.length,
				documentsScanned: folderMedical + folderNeedsReview,
				medicalReports: folderMedical,
				needsReview: folderNeedsReview,
				importCandidates: folderMedical + folderNeedsReview,
				lastScanAt,
				nextScheduledScanAt: computeNextScheduledScan(),
			}
		}),
	}
}

export function healthImportStatusQueryKey(userId: string | undefined) {
	return queryKeys.import.status(userId)
}
