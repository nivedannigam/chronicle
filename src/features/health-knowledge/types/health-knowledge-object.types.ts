import type { ReportBadgeStatus } from '@/features/health/types/health-coverage.types'
import type { MetricCategoryId } from '@/features/health-knowledge/types/health-knowledge.types'

export type MetricDataSource = 'parser' | 'llm' | 'manual'

export type MetricValidationStatus =
	'validated' | 'unvalidated' | 'partial' | 'failed'

export type KnowledgeLimitationCode =
	| 'no_reports'
	| 'single_report'
	| 'no_previous_comparison'
	| 'missing_lipid_profile'
	| 'missing_diabetes_panel'
	| 'missing_thyroid_panel'
	| 'low_ocr_confidence'
	| 'medium_parser_confidence'
	| 'import_failures'
	| 'partial_report'
	| 'reprocess_needed'
	| 'processing_in_progress'
	| 'incomplete_corpus'

export type KnowledgeTimelineEventType =
	| 'report_imported'
	| 'metric_abnormal'
	| 'metric_critical'
	| 'metric_improved'
	| 'metric_declined'
	| 'report_partial'

export type KnowledgeMetricPriority = 'critical' | 'high' | 'medium' | 'low'

export interface HealthKnowledgePatient {
	userId: string
}

export interface HealthKnowledgeFamilyMember {
	id: string | null
	displayName: string
	relationship: string
	isAccountOwner: boolean
	dateOfBirth: string | null
	gender: string | null
}

export interface HealthKnowledgeReportRef {
	id: string
	title: string
	date: string
	lab: string
	status: string
	metricCount: number
	classifiedCount: number
	unknownCount: number
	isDisplayReady: boolean
	needsReprocess: boolean
	badgeStatus: ReportBadgeStatus
	reportType: string | null
	parserConfidence: number | null
	ocrConfidence: number | null
}

export interface HealthKnowledgeMetric {
	id: string
	canonicalId: string
	displayName: string
	value: string
	unit: string | null
	status: string
	categoryId: MetricCategoryId
	observedAt: string
	reportId: string
	reportTitle: string
	referenceRange: string
	source: MetricDataSource
	confidence: number
	validationStatus: MetricValidationStatus
	clinicalScore: number
	priority: KnowledgeMetricPriority
	rankingReason: string
	isQualitative: boolean
}

export interface HealthKnowledgeTimelineEvent {
	id: string
	type: KnowledgeTimelineEventType
	title: string
	description: string
	date: string
	evidenceIds: string[]
	reportId?: string
	metricId?: string
}

export interface HealthKnowledgeLimitation {
	code: KnowledgeLimitationCode
	message: string
	severity: 'info' | 'warning' | 'error'
}

export interface HealthKnowledgeTrendPoint {
	metricId: string
	displayName: string
	direction: string
	changePercent: number | null
	dataPointCount: number
	isActionable: boolean
	clinicalScore: number
	evidenceIds: string[]
}

export interface HealthKnowledgeInsight {
	id: string
	text: string
	tone: 'positive' | 'warning' | 'neutral'
	metricId?: string
	evidenceIds: string[]
}

export interface HealthKnowledgeRecommendation {
	id: string
	text: string
	priority: 'high' | 'medium' | 'low'
	evidenceIds: string[]
}

export interface HealthKnowledgeConfidence {
	overall: number
	dataCompleteness: number
	parserConfidence: number | null
	metricCoverage: number
	reportCount: number
	displayReadyCount: number
}

export interface HealthKnowledgeSource {
	type: 'health_report' | 'health_metric' | 'workflow' | 'coverage'
	id: string
	label: string
	date?: string
}

export interface HealthKnowledgeSummary {
	headline: string
	lines: string[]
	metricCount: number
	abnormalCount: number
	criticalCount: number
	reportCount: number
}

/** Canonical health knowledge object — independent of database implementation. */
export interface HealthKnowledge {
	patient: HealthKnowledgePatient
	familyMember: HealthKnowledgeFamilyMember
	latestReport: HealthKnowledgeReportRef | null
	previousReports: HealthKnowledgeReportRef[]
	metrics: HealthKnowledgeMetric[]
	abnormalMetrics: HealthKnowledgeMetric[]
	normalMetrics: HealthKnowledgeMetric[]
	criticalMetrics: HealthKnowledgeMetric[]
	borderlineMetrics: HealthKnowledgeMetric[]
	trendAnalysis: HealthKnowledgeTrendPoint[]
	healthScore: number | null
	timeline: HealthKnowledgeTimelineEvent[]
	insights: HealthKnowledgeInsight[]
	recommendations: HealthKnowledgeRecommendation[]
	confidence: HealthKnowledgeConfidence
	limitations: HealthKnowledgeLimitation[]
	sources: HealthKnowledgeSource[]
	summary: HealthKnowledgeSummary
	generatedAt: string
	buildDurationMs: number
}

export interface HealthKnowledgeGetInput {
	userId: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
}
