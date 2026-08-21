import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'

export type QuestionType =
	| 'STATUS_OVERVIEW'
	| 'FACT_LOOKUP'
	| 'TREND'
	| 'COMPARE'
	| 'LATEST_REPORT'
	| 'EXPLAIN'
	| 'ENTITY_LOOKUP'
	| 'COVERAGE'
	| 'UNKNOWN'

export interface EvidenceSubject {
	categoryId?: string
	metricIds?: string[]
	metricNames?: string[]
	reportId?: string
	reportIds?: string[]
	timeRangeYears?: number
}

export interface EvidenceRequest {
	questionType: QuestionType
	domain: KnowledgeDomainId
	subject: EvidenceSubject
	question: string
}

export interface EvidenceBundleReport {
	id: string
	title: string
	date: string
	lab: string
	metricCount: number
	reportType: string | null
	badgeStatus?: string
	metricless?: boolean
}

export interface EvidenceBundleMetric {
	id: string
	canonicalId: string
	displayName: string
	value: string
	unit: string | null
	status: string
	referenceRange: string
	observedAt: string
	reportId: string
	reportTitle: string
	categoryId?: string
	temporalRole?: 'latest' | 'previous' | 'history'
}

export interface EvidenceBundleTrend {
	metricId: string
	displayName: string
	direction: string
	changePercent: number | null
	dataPointCount: number
	isActionable: boolean
}

export interface EvidenceBundleTimelineEvent {
	id: string
	type: string
	title: string
	description: string
	date: string
	reportId?: string
	metricId?: string
}

export interface EvidenceBundleSummary {
	headline: string
	lines: string[]
	healthScore: number | null
	limitations: string[]
}

export interface EvidenceBundle {
	reports: EvidenceBundleReport[]
	metrics: EvidenceBundleMetric[]
	trends: EvidenceBundleTrend[]
	timeline: EvidenceBundleTimelineEvent[]
	summary: EvidenceBundleSummary
	metadata: {
		questionType: QuestionType
		resolver: string
		excluded: string[]
	}
}
