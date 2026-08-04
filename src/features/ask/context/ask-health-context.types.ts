import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type { HealthCoverageSnapshot } from '@/features/health/types/health-coverage.types'
import type { RankedMetric } from '@/features/ask/clinical/clinical-response.types'

export interface AskHealthContextReport {
	id: string
	title: string
	date: string
	lab?: string
	metricCount?: number
}

export interface AskHealthContextMetric {
	id: string
	displayName: string
	value: string
	unit?: string
	status: string
	observedAt: string
	reportId?: string
	reportTitle?: string
}

export interface AskHealthContextChange {
	metricName: string
	fromValue: string
	toValue: string
	fromDate: string
	toDate: string
	direction: 'up' | 'down' | 'stable' | 'unknown'
}

/** Structured health knowledge for Gemini — no user-facing prose. */
export interface AskHealthContext {
	healthSummary: {
		reportCount: number
		metricCount: number
		abnormalCount: number
		hasMultipleReports: boolean
	}
	latestReport: AskHealthContextReport | null
	reportHistory: AskHealthContextReport[]
	importantMetrics: AskHealthContextMetric[]
	abnormalFindings: AskHealthContextMetric[]
	recentChanges: AskHealthContextChange[]
	timeline: string[]
	evidence: Array<{
		id: string
		reportId: string
		reportTitle: string
		reportDate: string
		metricName?: string
		metricValue?: string
	}>
	/** Internal flags only — never rendered to users. */
	internal: {
		dataAvailable: boolean
		corpusCompleteness?: HealthCoverageSnapshot['corpusCompleteness']
	}
	rawKnowledge: RetrievedKnowledge
	rankedImportant: RankedMetric[]
}
