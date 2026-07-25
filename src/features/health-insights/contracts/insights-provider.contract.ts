import type {
	ChronicleInsight,
	HealthScorecard,
} from '@/features/health-insights/types/health-insights.types'

export interface InsightsProviderContext {
	userId: string
	sources: Record<string, unknown>
}

export interface InsightsProviderResult {
	domain: string
	available: boolean
	insights: ChronicleInsight[]
	scorecard?: HealthScorecard
}

/** Extensible contract — Finance, Travel, Insurance implement the same interface. */
export interface ChronicleInsightsProvider {
	readonly id: string
	readonly domain: string
	readonly label: string

	isAvailable(context: InsightsProviderContext): boolean
	generateInsights(context: InsightsProviderContext): InsightsProviderResult
}
