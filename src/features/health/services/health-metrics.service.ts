import { filterReportsForMember } from '@/features/family/utils/member-display'
import { mapMetricStatusToUi } from '@/features/health/extraction/metric-extraction.engine'
import { formatReferenceRange } from '@/features/health/extraction/reference-range.engine'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { HealthMetric as UiHealthMetric } from '@/features/health/types'
import { supabase } from '@/lib/supabase'

function mapStoredHealthMetric(
	row: Record<string, unknown>,
): StoredHealthMetric {
	return {
		id: row.id as string,
		user_id: row.user_id as string,
		family_member_id: (row.family_member_id as string | null) ?? null,
		report_id: row.report_id as string,
		workflow_item_id: (row.workflow_item_id as string | null) ?? null,
		canonical_metric_id: row.canonical_metric_id as string,
		display_name: row.display_name as string,
		raw_name: row.raw_name as string,
		value: row.value as string,
		numeric_value:
			typeof row.numeric_value === 'number' ? row.numeric_value : null,
		unit: (row.unit as string | null) ?? null,
		reference_range_raw: (row.reference_range_raw as string | null) ?? null,
		reference_lower:
			typeof row.reference_lower === 'number' ? row.reference_lower : null,
		reference_upper:
			typeof row.reference_upper === 'number' ? row.reference_upper : null,
		status: row.status as StoredHealthMetric['status'],
		category: row.category as string,
		report_date: (row.report_date as string | null) ?? null,
		observed_at: row.observed_at as string,
		confidence: typeof row.confidence === 'number' ? row.confidence : 0.5,
		source: row.source as string,
		created_at: row.created_at as string,
	}
}

export async function fetchHealthMetricsForUser(
	userId: string,
	options: {
		familyMemberId?: string | null
		accountOwnerMemberId?: string | null
		reportIds?: string[]
	} = {},
): Promise<StoredHealthMetric[]> {
	let query = supabase
		.from('health_metrics')
		.select('*')
		.eq('user_id', userId)
		.order('observed_at', { ascending: true })

	if (options.reportIds && options.reportIds.length > 0) {
		query = query.in('report_id', options.reportIds)
	}

	const { data, error } = await query

	if (error) {
		throw new Error(error.message)
	}

	let metrics = (data ?? []).map((row) =>
		mapStoredHealthMetric(row as Record<string, unknown>),
	)

	if (options.familyMemberId) {
		metrics = metrics.filter(
			(metric) =>
				metric.family_member_id === options.familyMemberId ||
				(metric.family_member_id == null &&
					options.familyMemberId === options.accountOwnerMemberId),
		)
	}

	return metrics
}

export async function fetchHealthMetricsForReport(
	reportId: string,
): Promise<StoredHealthMetric[]> {
	const { data, error } = await supabase
		.from('health_metrics')
		.select('*')
		.eq('report_id', reportId)
		.order('display_name', { ascending: true })

	if (error) {
		throw new Error(error.message)
	}

	return (data ?? []).map((row) =>
		mapStoredHealthMetric(row as Record<string, unknown>),
	)
}

export function filterMetricsForMemberReports(
	metrics: StoredHealthMetric[],
	reports: Array<{ id: string; family_member_id?: string | null }>,
	selectedMemberId: string | null | undefined,
	accountOwnerMemberId: string | null | undefined,
): StoredHealthMetric[] {
	const allowedReportIds = new Set(
		filterReportsForMember(
			reports as import('@/features/health/types').UploadedHealthReport[],
			selectedMemberId,
			accountOwnerMemberId ?? null,
		).map((report) => report.id),
	)

	return metrics.filter((metric) => allowedReportIds.has(metric.report_id))
}

function formatStoredReferenceRange(metric: StoredHealthMetric): string {
	if (metric.reference_range_raw) {
		return metric.reference_range_raw
	}

	return formatReferenceRange({
		lowerLimit: metric.reference_lower,
		upperLimit: metric.reference_upper,
		unit: metric.unit,
		rawText: '',
	})
}

export function storedMetricsToUiMetrics(
	metrics: StoredHealthMetric[],
): UiHealthMetric[] {
	return metrics.map((metric) => ({
		name: metric.display_name,
		value: metric.unit ? `${metric.value} ${metric.unit}` : metric.value,
		reference: formatStoredReferenceRange(metric),
		status: mapMetricStatusToUi(metric.status),
		confidence: metric.confidence,
	}))
}
