import { healthKnowledgeService } from '@/features/health-knowledge/services/health-knowledge.service'
import type {
	ConnectorDocumentRecord,
	ConnectorSyncRun,
} from '@/core/connectors'
import type { HealthImportSummary } from '@/features/health-import/types/health-import.types'

export function buildImportSummary(input: {
	userId: string
	registry: ConnectorDocumentRecord[]
	syncRun: ConnectorSyncRun | null
	durationMs: number
	uploadedReports?: import('@/features/health/types').UploadedHealthReport[]
}): HealthImportSummary {
	const completed = input.registry.filter(
		(record) => record.importStatus === 'completed',
	)
	const skipped = input.registry.filter(
		(record) => record.importStatus === 'skipped',
	)
	const failed = input.registry.filter(
		(record) => record.importStatus === 'failed',
	)

	const dates = completed
		.map((record) => record.externalModifiedAt ?? record.importedAt)
		.filter(Boolean)
		.map((value) => new Date(value!).getTime())
		.sort((a, b) => a - b)

	const graph = healthKnowledgeService.getGraphForUser(
		input.userId,
		input.uploadedReports ?? [],
	)

	const metricCount = graph.profile.metricHistories.reduce(
		(sum, history) => sum + history.observations.length,
		0,
	)

	const years =
		dates.length >= 2
			? Math.max(
					1,
					Math.ceil(
						(dates[dates.length - 1]! - dates[0]!) /
							(365.25 * 24 * 60 * 60 * 1000),
					),
				)
			: dates.length === 1
				? 1
				: 0

	return {
		reportsImported: completed.length,
		metricsExtracted: metricCount,
		yearsCovered: years,
		timelineEvents: graph.profile.reportIds.length,
		categoriesCount: graph.profile.categories.filter((c) => c.metricCount > 0)
			.length,
		firstReportDate: dates[0]
			? new Date(dates[0]).toISOString().slice(0, 10)
			: null,
		latestReportDate: dates.length
			? new Date(dates[dates.length - 1]!).toISOString().slice(0, 10)
			: null,
		skippedCount: skipped.length,
		failedCount: failed.length,
		durationMs: input.durationMs,
	}
}

export function formatDuration(ms: number): string {
	const seconds = Math.round(ms / 1000)

	if (seconds < 60) {
		return `${seconds}s`
	}

	const minutes = Math.floor(seconds / 60)
	const remainder = seconds % 60

	return `${minutes}m ${remainder}s`
}
