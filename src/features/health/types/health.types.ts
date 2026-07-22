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
}
