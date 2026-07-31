import type {
	ChronicleInsight,
	HealthScorecard,
} from '@/features/health-insights/types/health-insights.types'
import {
	generateHealthInsights,
	insightsForAskIntent,
} from '@/features/health-insights/engines/health-insights.engine'
import {
	getRegisteredInsightsProviders,
	registerInsightsProvider,
} from '@/features/health-insights/registry/insights-registry'
import { healthInsightsProvider } from '@/features/health-insights/providers/health-insights.provider'
import { chronicleInsightsToHealthInsights } from '@/features/health-insights/utils/insight-mapper'
import type {
	HealthInsight,
	UploadedHealthReport,
} from '@/features/health/types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import { healthKnowledgeService } from '@/features/health-knowledge/services/health-knowledge.service'

let bootstrapped = false

function bootstrapInsightsProviders(): void {
	if (bootstrapped) {
		return
	}

	registerInsightsProvider(healthInsightsProvider)
	bootstrapped = true
}

export interface ProactiveInsightsResult {
	insights: ChronicleInsight[]
	scorecard: HealthScorecard | null
	healthInsights: HealthInsight[]
}

export function getProactiveHealthInsights(input: {
	userId: string | undefined
	uploadedReports: UploadedHealthReport[]
	storedMetrics?: StoredHealthMetric[]
	limit?: number
}): ProactiveInsightsResult {
	bootstrapInsightsProviders()

	const userId = input.userId ?? 'default-person'
	const graph = healthKnowledgeService.getGraphForUser(
		userId,
		input.uploadedReports,
		input.storedMetrics ?? [],
	)
	const ranked = generateHealthInsights({
		userId,
		uploadedReports: input.uploadedReports,
		graph,
		limit: input.limit ?? 12,
	})

	return {
		insights: ranked.insights,
		scorecard: ranked.scorecard,
		healthInsights: chronicleInsightsToHealthInsights(
			ranked.insights.slice(0, input.limit ?? 5),
		),
	}
}

export function getAskInsights(input: {
	userId: string
	uploadedReports: UploadedHealthReport[]
	intent: string
	categoryId?: string
}): ChronicleInsight[] {
	const result = getProactiveHealthInsights({
		userId: input.userId,
		uploadedReports: input.uploadedReports,
		limit: 12,
	})

	return insightsForAskIntent(result.insights, input.intent, input.categoryId)
}

export const healthInsightsService = {
	getProactiveHealthInsights,
	getAskInsights,
}

// Re-export for provider registry usage
export { getRegisteredInsightsProviders }
