import type { MetricStatus } from '@/features/health/domain/metric.types'

export interface StoredHealthMetric {
	id: string
	user_id: string
	family_member_id: string | null
	report_id: string
	workflow_item_id: string | null
	canonical_metric_id: string
	display_name: string
	raw_name: string
	value: string
	numeric_value: number | null
	unit: string | null
	reference_range_raw: string | null
	reference_lower: number | null
	reference_upper: number | null
	status: MetricStatus
	category: string
	report_date: string | null
	observed_at: string
	confidence: number
	source: string
	created_at: string
}

export interface PersistHealthMetricsInput {
	userId: string
	reportId: string
	familyMemberId?: string | null
	healthReport: import('@/features/health/domain/health-report.domain').HealthReport
	reportDate?: string | null
	observedAt?: string
}
