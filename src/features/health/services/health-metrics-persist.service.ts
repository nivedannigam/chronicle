import type { HealthReport } from '@/features/health/domain/health-report.domain'
import type { HealthMetric } from '@/features/health/domain/metric.types'
import {
	findMetricDefinitionById,
	mapCategoryId,
} from '@/features/health-knowledge/graph/metric-categories'
import type { PersistHealthMetricsInput } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'
import {
	getParsedHealthReport,
	getReportDisplayDate,
} from '@/features/health/services/health-parsed-report.service'
import {
	isMissingSchemaError,
	missingHealthMetricsMessage,
} from '@/features/connectors/services/connector-schema.utils'
import { supabase } from '@/lib/supabase'

function resolveMetricCategory(
	canonicalMetricId: string,
	reportType: string,
): string {
	const definition = findMetricDefinitionById(canonicalMetricId)

	if (definition) {
		return definition.categoryId
	}

	if (canonicalMetricId.startsWith('raw:')) {
		return 'blood'
	}

	return mapCategoryId(reportType) ?? 'blood'
}

function toMetricRow(input: {
	userId: string
	reportId: string
	familyMemberId: string | null
	workflowItemId: string | null
	reportType: string
	reportDate: string | null
	observedAt: string
	metric: HealthMetric
	source: string
}) {
	return {
		user_id: input.userId,
		family_member_id: input.familyMemberId,
		report_id: input.reportId,
		workflow_item_id: input.workflowItemId,
		canonical_metric_id: input.metric.canonicalId,
		display_name: input.metric.displayName,
		raw_name: input.metric.rawName,
		value: input.metric.value,
		numeric_value: input.metric.numericValue,
		unit: input.metric.unit,
		reference_range_raw: input.metric.referenceRange.rawText || null,
		reference_lower: input.metric.referenceRange.lowerLimit,
		reference_upper: input.metric.referenceRange.upperLimit,
		status: input.metric.status,
		category: resolveMetricCategory(input.metric.canonicalId, input.reportType),
		report_date: input.reportDate,
		observed_at: input.observedAt,
		confidence: input.metric.confidence,
		source: input.source,
	}
}

async function resolveWorkflowItemId(reportId: string): Promise<string | null> {
	const { data, error } = await supabase
		.from('health_workflow_items')
		.select('id')
		.eq('report_id', reportId)
		.maybeSingle()

	if (error) {
		if (import.meta.env.DEV) {
			console.warn('Could not resolve workflow item for report:', error.message)
		}

		return null
	}

	return (data?.id as string | undefined) ?? null
}

function rethrowMetricsSchemaError(error: unknown): never {
	if (isMissingSchemaError(error)) {
		throw new Error(missingHealthMetricsMessage())
	}

	throw error instanceof Error ? error : new Error(String(error))
}

export async function persistHealthMetrics(
	input: PersistHealthMetricsInput,
): Promise<number> {
	const { userId, reportId, familyMemberId, healthReport } = input

	if (healthReport.metrics.length === 0) {
		const { error: deleteError } = await supabase
			.from('health_metrics')
			.delete()
			.eq('report_id', reportId)

		if (deleteError) {
			rethrowMetricsSchemaError(deleteError)
		}

		return 0
	}

	const workflowItemId = await resolveWorkflowItemId(reportId)
	const reportDate =
		input.reportDate ??
		healthReport.metadata.reportDate ??
		healthReport.createdAt.slice(0, 10)
	const observedAt =
		input.observedAt ??
		(healthReport.metadata.reportDate != null
			? new Date(`${healthReport.metadata.reportDate}T12:00:00`).toISOString()
			: healthReport.createdAt)
	const reportType = healthReport.metadata.reportType

	const metricResults = healthReport.metricResults ?? []
	const rows = healthReport.metrics.map((metric, index) =>
		toMetricRow({
			userId,
			reportId,
			familyMemberId: familyMemberId ?? null,
			workflowItemId,
			reportType,
			reportDate,
			observedAt,
			metric,
			source: metricResults[index]?.source ?? 'text',
		}),
	)

	const { error: deleteError } = await supabase
		.from('health_metrics')
		.delete()
		.eq('report_id', reportId)

	if (deleteError) {
		rethrowMetricsSchemaError(deleteError)
	}

	const { error: insertError } = await supabase
		.from('health_metrics')
		.insert(rows)

	if (insertError) {
		rethrowMetricsSchemaError(insertError)
	}

	return rows.length
}

export async function backfillHealthMetricsFromReports(
	userId: string,
	reports: UploadedHealthReport[],
): Promise<number> {
	let inserted = 0

	for (const report of reports.filter((item) => item.status === 'completed')) {
		const parsed = getParsedHealthReport(report)

		if (!parsed || parsed.metrics.length === 0) {
			continue
		}

		const { count, error: countError } = await supabase
			.from('health_metrics')
			.select('id', { count: 'exact', head: true })
			.eq('report_id', report.id)

		if (countError) {
			if (isMissingSchemaError(countError)) {
				return 0
			}

			throw new Error(countError.message)
		}

		if ((count ?? 0) > 0) {
			const parsedCanonicalIds = new Set(
				parsed.metrics.map((metric) => metric.canonicalId).filter(Boolean),
			)
			const { data: existingRows } = await supabase
				.from('health_metrics')
				.select('canonical_metric_id')
				.eq('report_id', report.id)

			const storedIds = new Set(
				(existingRows ?? []).map((row) => row.canonical_metric_id as string),
			)
			const hasNewMetrics = [...parsedCanonicalIds].some(
				(id) => !storedIds.has(id),
			)
			const displayDate = getReportDisplayDate(report, parsed)
			const storedDateMismatch =
				displayDate !== (report.report_date ?? '') &&
				displayDate !== (parsed.metadata.reportDate ?? '')

			if (
				!hasNewMetrics &&
				parsed.metrics.length === storedIds.size &&
				!storedDateMismatch
			) {
				continue
			}
		}

		const displayDate = getReportDisplayDate(report, parsed)

		inserted += await persistHealthMetrics({
			userId,
			reportId: report.id,
			familyMemberId: report.family_member_id ?? null,
			healthReport: parsed as HealthReport,
			reportDate: displayDate,
			observedAt: `${displayDate}T12:00:00.000Z`,
		})
	}

	return inserted
}

export async function deleteHealthMetricsForReports(
	reportIds: string[],
): Promise<void> {
	if (reportIds.length === 0) {
		return
	}

	const { error } = await supabase
		.from('health_metrics')
		.delete()
		.in('report_id', reportIds)

	if (error) {
		throw new Error(error.message)
	}
}
