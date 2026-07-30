import { queryClient } from '@/lib/query-client'
import { queryKeys } from '@/lib/query-keys'

const GOOGLE_DRIVE = 'google-drive'

export function invalidateFamilyQueries(userId: string | undefined) {
	void queryClient.invalidateQueries({
		queryKey: queryKeys.family.members(userId),
	})
	void queryClient.invalidateQueries({
		queryKey: queryKeys.family.context(userId),
	})
}

export function invalidateHealthSourcesQueries(userId: string | undefined) {
	void queryClient.invalidateQueries({
		queryKey: queryKeys.health.sources(userId),
	})
}

export function invalidateHealthReportsQueries(userId: string | undefined) {
	void queryClient.invalidateQueries({
		queryKey: queryKeys.health.reports(userId),
	})
}

export function invalidateHealthDashboardQueries(userId: string | undefined) {
	void queryClient.invalidateQueries({
		queryKey: queryKeys.health.dashboard(userId),
	})
	void queryClient.invalidateQueries({
		queryKey: queryKeys.health.timeline(userId),
	})
}

export function invalidateImportStatusQueries(userId: string | undefined) {
	void queryClient.invalidateQueries({
		queryKey: queryKeys.import.status(userId),
	})
}

export function invalidateImportReviewQueries(userId: string | undefined) {
	void queryClient.invalidateQueries({
		queryKey: queryKeys.import.review(userId, 'actionable'),
	})
}

export function invalidateDiscoveryQueries(userId: string | undefined) {
	void queryClient.invalidateQueries({
		queryKey: queryKeys.discovery.stats(userId),
	})
	void queryClient.invalidateQueries({
		queryKey: queryKeys.discovery.latestRun(userId),
	})
	void queryClient.invalidateQueries({ queryKey: ['discovery-files', userId] })
}

export function invalidateConnectorRegistryQueries(userId: string | undefined) {
	void queryClient.invalidateQueries({
		queryKey: queryKeys.connectors.registry(userId, GOOGLE_DRIVE),
	})
}

export function invalidateConnectorQueries(userId: string | undefined) {
	void queryClient.invalidateQueries({
		queryKey: queryKeys.connectors.connection(userId, GOOGLE_DRIVE),
	})
	void queryClient.invalidateQueries({
		queryKey: queryKeys.connectors.folders(userId, GOOGLE_DRIVE),
	})
	void queryClient.invalidateQueries({
		queryKey: queryKeys.connectors.registry(userId, GOOGLE_DRIVE),
	})
	void queryClient.invalidateQueries({
		queryKey: queryKeys.connectors.syncRun(userId, GOOGLE_DRIVE),
	})
}

export function invalidateHealthWorkflowQueries(userId: string | undefined) {
	void queryClient.invalidateQueries({
		queryKey: queryKeys.health.workflow(userId),
	})
}

export function invalidateAfterHealthImport(userId: string | undefined) {
	invalidateHealthReportsQueries(userId)
	invalidateHealthDashboardQueries(userId)
	invalidateImportStatusQueries(userId)
	invalidateConnectorRegistryQueries(userId)
	invalidateImportReviewQueries(userId)
	invalidateHealthWorkflowQueries(userId)
	invalidateOcrProviderStatusQueries(userId)
}

export function invalidateOcrProviderStatusQueries(userId: string | undefined) {
	if (!userId) {
		return
	}

	void queryClient.invalidateQueries({
		queryKey: queryKeys.health.ocrStatus(userId),
	})
}

export function invalidateAfterFolderAssignment(userId: string | undefined) {
	invalidateHealthSourcesQueries(userId)
	invalidateAfterHealthImport(userId)
	invalidateDiscoveryQueries(userId)
}

export function invalidateAfterDiscoveryScan(userId: string | undefined) {
	invalidateDiscoveryQueries(userId)
	invalidateImportStatusQueries(userId)
	invalidateHealthDashboardQueries(userId)
}

export function invalidateAfterImportReview(userId: string | undefined) {
	invalidateImportReviewQueries(userId)
	invalidateConnectorRegistryQueries(userId)
	invalidateImportStatusQueries(userId)
	invalidateHealthReportsQueries(userId)
	invalidateHealthDashboardQueries(userId)
	invalidateHealthWorkflowQueries(userId)
}
