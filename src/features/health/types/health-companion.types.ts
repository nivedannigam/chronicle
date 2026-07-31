export type HealthStatusLabel =
	| 'Looking Good'
	| 'Needs Attention'
	| 'Improving'
	| 'Monitoring Required'
	| 'Awaiting Data'

export interface HealthAttentionItem {
	id: string
	title: string
	detail: string
	severity: 'high' | 'medium' | 'low'
	categoryId?: string
	metricId?: string
	reportId?: string
}

export interface HealthChangeItem {
	id: string
	label: string
	direction: 'improved' | 'worsened' | 'stable' | 'resolved'
	detail?: string
}

export interface HealthNextStep {
	id: string
	title: string
	reason: string
	actionLabel?: string
	actionPath?: string
}

export interface HealthJourneyEvent {
	id: string
	date: string
	displayDate: string
	title: string
	summary: string
	kind: 'checkup' | 'finding' | 'improvement' | 'monitoring' | 'review'
	reportId?: string
	categoryId?: string
}

export interface MetricInsightGroup {
	id: string
	label: string
	status: 'improving' | 'stable' | 'needs_attention'
	color: string
	metrics: Array<{
		id: string
		name: string
		value: string
		trendLabel: string
		status: string
	}>
}

export interface HealthReportSummary {
	id: string
	title: string
	hospital: string
	doctor?: string
	date: string
	displayDate: string
	summary: string
	findings: string[]
	status: string
	isReady: boolean
}

export interface HealthScoreReason {
	id: string
	label: string
	kind: 'positive' | 'warning' | 'neutral'
}

export interface HealthTrendHighlight {
	id: string
	label: string
	detail: string
	status: 'improving' | 'stable' | 'needs_attention' | 'new_finding'
	metricId?: string
	categoryId?: string
}

export interface HealthInsightGroup {
	id: string
	label: string
	color: string
	summary: string
	trend: string
	evidence: string
	nextStep: string
	metricId?: string
	reportId?: string
	categoryId?: string
}

import type { TrendSeries } from '@/features/health/types'
import type {
	HealthSummary,
	LongitudinalHealthProfile,
} from '@/features/health-intelligence/types/health-profile.types'

export interface HealthCompanionView {
	status: HealthStatusLabel
	statusDetail: string
	score: number | null
	scoreReasons: HealthScoreReason[]
	attention: HealthAttentionItem[]
	changes: HealthChangeItem[]
	nextSteps: HealthNextStep[]
	recentReports: HealthReportSummary[]
	journeyEvents: HealthJourneyEvent[]
	metricGroups: MetricInsightGroup[]
	trendSeries: TrendSeries[]
	trendHighlights: HealthTrendHighlight[]
	insightGroups: HealthInsightGroup[]
	narrative: string[]
	profile: LongitudinalHealthProfile | null
	healthSummary: HealthSummary | null
}
