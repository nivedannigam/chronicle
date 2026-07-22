export type HealthCategoryId =
	| 'heart'
	| 'liver'
	| 'kidney'
	| 'diabetes'
	| 'thyroid'
	| 'vitamin'
	| 'blood-count'
	| 'general'

export type MetricStatus = 'normal' | 'low' | 'high' | 'critical'

export type SnapshotTrend = 'improving' | 'stable' | 'declining' | 'attention'

export type InsightTone = 'positive' | 'warning' | 'neutral'

export type UploadTimelineStatus = 'upload' | 'processing' | 'completed'

export interface HealthMetric {
	name: string
	value: string
	reference: string
	status: MetricStatus
}

export interface HealthReport {
	id: string
	date: string
	displayDate: string
	lab: string
	category: HealthCategoryId
	title: string
	summary: string
	metrics: HealthMetric[]
	doctorNotes: string
	recommendations: string[]
}

export interface HealthCategory {
	id: HealthCategoryId
	name: string
	color: string
	reportCount: number
}

export interface HealthDashboard {
	score: number
	latestReportId: string
	lastCheckupDate: string
	lastCheckupLabel: string
	overallStatus: string
	lastUpdated: string
}

export interface HealthSnapshot {
	id: string
	emoji: string
	name: string
	status: string
	trend: SnapshotTrend
	latestResultDate: string
	color: string
}

export interface HealthInsight {
	id: string
	text: string
	tone: InsightTone
}

export interface UpcomingAction {
	id: string
	title: string
	dueLabel: string
}

export interface HealthUploadTimelineItem {
	id: string
	fileName: string
	displayDate: string
	status: UploadTimelineStatus
	reportId?: string
}

export interface TrendDataPoint {
	date: string
	label: string
	value: number
}

export interface TrendSeries {
	id: string
	name: string
	unit: string
	color: string
	values: TrendDataPoint[]
}

export interface ReportComparisonMetric {
	metric: string
	oldValue: string
	newValue: string
	difference: string
	status: MetricStatus
}

export interface ReportComparison {
	id: string
	label: string
	olderReportId: string
	newerReportId: string
	olderLabel: string
	newerLabel: string
	metrics: ReportComparisonMetric[]
}

export type HealthReportStatus = 'queued' | 'processing' | 'ready' | 'failed'

export interface UploadedHealthReport {
	id: string
	user_id: string
	file_name: string
	storage_path: string
	report_date: string | null
	report_type: string
	uploaded_at: string
	created_at: string
	status: HealthReportStatus
	extracted_text: string | null
	processed_at: string | null
	processing_error: string | null
}

export interface HealthReportProcessingQueueItem {
	id: string
	report_id: string
	user_id: string
	status: HealthReportStatus
	created_at: string
	started_at: string | null
	completed_at: string | null
	error_message: string | null
}

export type HealthTimelineItem =
	| { type: 'mock'; report: HealthReport }
	| { type: 'upload'; report: UploadedHealthReport }

export const HEALTH_REPORTS_BUCKET = 'health-reports' as const

export const sectionLabelStyle = {
	fontSize: 11,
	fontWeight: 600,
	letterSpacing: '0.09em',
	textTransform: 'uppercase' as const,
	color: 'rgba(255,255,255,0.28)',
	marginBottom: 12,
}
