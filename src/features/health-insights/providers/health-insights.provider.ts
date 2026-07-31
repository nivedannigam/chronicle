import type {
	ChronicleInsightsProvider,
	InsightsProviderContext,
	InsightsProviderResult,
} from '@/features/health-insights/contracts/insights-provider.contract'
import { generateHealthInsights } from '@/features/health-insights/engines/health-insights.engine'
import { healthKnowledgeService } from '@/features/health-knowledge/services/health-knowledge.service'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'

const PROVIDER_ID = 'health'

function getHealthSource(context: InsightsProviderContext): {
	uploadedReports: UploadedHealthReport[]
	storedMetrics: StoredHealthMetric[]
} {
	const source = context.sources[PROVIDER_ID] as
		| {
				uploadedReports?: UploadedHealthReport[]
				storedMetrics?: StoredHealthMetric[]
		  }
		| undefined

	return {
		uploadedReports: source?.uploadedReports ?? [],
		storedMetrics: source?.storedMetrics ?? [],
	}
}

export class HealthInsightsProvider implements ChronicleInsightsProvider {
	readonly id = PROVIDER_ID
	readonly domain = 'health'
	readonly label = 'Health'

	isAvailable(context: InsightsProviderContext): boolean {
		return getHealthSource(context).uploadedReports.some(
			(report) => report.status === 'completed',
		)
	}

	generateInsights(context: InsightsProviderContext): InsightsProviderResult {
		const { uploadedReports, storedMetrics } = getHealthSource(context)

		if (!this.isAvailable(context)) {
			return {
				domain: this.domain,
				available: false,
				insights: [],
			}
		}

		const graph = healthKnowledgeService.getGraphForUser(
			context.userId,
			uploadedReports,
			storedMetrics,
		)
		const result = generateHealthInsights({
			userId: context.userId,
			uploadedReports,
			graph,
		})

		return {
			domain: this.domain,
			available: true,
			insights: result.insights,
			scorecard: result.scorecard,
		}
	}
}

export const healthInsightsProvider = new HealthInsightsProvider()
