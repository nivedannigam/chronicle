export type HealthStatusLabel =
	'Looking Good' | 'Needs Attention' | 'Improving' | 'Monitoring Required'

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

export interface HealthCompanionView {
	status: HealthStatusLabel
	statusDetail: string
	score: number | null
	attention: HealthAttentionItem[]
	changes: HealthChangeItem[]
	nextSteps: HealthNextStep[]
	recentReports: HealthReportSummary[]
	journeyEvents: HealthJourneyEvent[]
	metricGroups: MetricInsightGroup[]
	narrative: string[]
}
