import { healthInsightsService } from '@/features/health-insights/services/health-insights.service'
import {
	buildHealthKnowledgeGraph,
	buildHealthKnowledgeSourceKey,
	categorySnapshotsToHealthSnapshots,
	derivedInsightsToHealthInsights,
	metricHistoriesToTrendSeries,
} from '@/features/health-knowledge/services/health-knowledge-builder'
import {
	getCachedHealthKnowledge,
	invalidateHealthKnowledgeCache,
	setCachedHealthKnowledge,
} from '@/features/health-knowledge/services/health-knowledge-cache'
import type {
	BuildHealthKnowledgeInput,
	HealthKnowledgeGraph,
	HealthMetricHistory,
} from '@/features/health-knowledge/types'
import type {
	HealthInsight,
	HealthSnapshot,
	TrendSeries,
	UploadedHealthReport,
} from '@/features/health/types'

const DEFAULT_PERSON_ID = 'default-person'

export class HealthKnowledgeService {
	getGraph(input: BuildHealthKnowledgeInput): HealthKnowledgeGraph {
		const sourceKey = buildHealthKnowledgeSourceKey(
			input.mockReports,
			input.uploadedReports,
		)
		const cached = getCachedHealthKnowledge(input.personId, sourceKey)

		if (cached) {
			return cached
		}

		const graph = buildHealthKnowledgeGraph(input)
		setCachedHealthKnowledge(input.personId, sourceKey, graph)

		return graph
	}

	getGraphForUser(
		userId: string | undefined,
		uploadedReports: UploadedHealthReport[] = [],
	): HealthKnowledgeGraph {
		return this.getGraph({
			personId: userId ?? DEFAULT_PERSON_ID,
			mockReports: [],
			uploadedReports,
		})
	}

	getSnapshots(
		userId: string | undefined,
		uploadedReports: UploadedHealthReport[] = [],
	): HealthSnapshot[] {
		const graph = this.getGraphForUser(userId, uploadedReports)

		return categorySnapshotsToHealthSnapshots(graph.profile.categories)
	}

	getInsights(
		userId: string | undefined,
		uploadedReports: UploadedHealthReport[] = [],
	): HealthInsight[] {
		const proactive = healthInsightsService.getProactiveHealthInsights({
			userId,
			uploadedReports,
			limit: 12,
		})

		if (proactive.healthInsights.length > 0) {
			return proactive.healthInsights
		}

		const graph = this.getGraphForUser(userId, uploadedReports)

		return derivedInsightsToHealthInsights(graph.profile.insights)
	}

	getTrendSeries(
		userId: string | undefined,
		uploadedReports: UploadedHealthReport[] = [],
	): TrendSeries[] {
		const graph = this.getGraphForUser(userId, uploadedReports)
		const series = metricHistoriesToTrendSeries(graph.profile.metricHistories)

		if (series.length > 0) {
			return series
		}

		return []
	}

	getMetricHistory(
		userId: string | undefined,
		metricId: string,
		uploadedReports: UploadedHealthReport[] = [],
	): HealthMetricHistory | null {
		const graph = this.getGraphForUser(userId, uploadedReports)

		return (
			graph.profile.metricHistories.find(
				(history) => history.canonicalMetricId === metricId,
			) ?? null
		)
	}

	invalidate(userId?: string): void {
		invalidateHealthKnowledgeCache(userId)
	}
}

export const healthKnowledgeService = new HealthKnowledgeService()
