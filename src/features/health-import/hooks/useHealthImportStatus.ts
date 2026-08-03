import { useQuery } from '@tanstack/react-query'

import {
	fetchHealthImportStatus,
	type HealthImportStatus,
} from '@/features/health-import/services/health-import-status.service'

import {
	healthImportStatusQueryKey,
	queryKeys,
	STALE_TIME,
} from '@/lib/query-keys'

export { healthImportStatusQueryKey }

const EMPTY_STATUS: HealthImportStatus = {
	hasImportedReports: false,

	completedReportsCount: 0,

	failedImportsCount: 0,

	importingCount: 0,

	processingCount: 0,

	filesFound: 0,

	documentsScanned: 0,

	medicalReportsCount: 0,

	needsReviewCount: 0,

	actionableReviewCount: 0,

	importCandidatesCount: 0,

	skippedIgnoredCount: 0,

	lastScanAt: null,

	nextScheduledScanAt: null,

	folders: [],
}

export function useHealthImportStatus(userId: string | undefined) {
	return useQuery({
		queryKey: queryKeys.import.status(userId),

		queryFn: () => fetchHealthImportStatus(userId!),

		enabled: Boolean(userId),

		staleTime: STALE_TIME.importStatus,

		placeholderData: EMPTY_STATUS,
	})
}
