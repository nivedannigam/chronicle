import type { AskIntent } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type {
	RetrievedMetric,
	RetrievedReport,
	RetrievedTrend,
} from '@/features/knowledge/retrieval/knowledge-retriever.types'

export type ClinicalPriority = 'critical' | 'high' | 'medium' | 'low'

export interface RankedMetric extends RetrievedMetric {
	clinicalScore: number
	priority: ClinicalPriority
	rankingReason: string
}

export interface RankedTrend extends RetrievedTrend {
	clinicalScore: number
	isActionable: boolean
}

export interface RankedEvidence {
	metrics: RankedMetric[]
	trends: RankedTrend[]
	insights: string[]
	alerts: string[]
	reports: RetrievedReport[]
	reportCount: number
	singleReport: boolean
	latestReportLabel: string | null
	abnormalCount: number
	normalCount: number
}

export interface ClinicalAnswer {
	intent: AskIntent
	executiveSummary: string
	keyFindings: string[]
	recommendations: string[]
	limitations: string[]
	rankedEvidence: RankedEvidence
	importantMetricIds: string[]
	showTrendCards: boolean
	showComparisonLanguage: boolean
}

export interface ClinicalResponseInput {
	knowledge: import('@/features/knowledge/retrieval/knowledge-retriever.types').RetrievedKnowledge
	question: string
	memberName?: string | null
	dataAvailable: boolean
}
