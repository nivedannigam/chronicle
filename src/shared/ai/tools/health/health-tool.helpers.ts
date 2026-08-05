import type { MetricCategoryId } from '@/features/health-knowledge/types/health-knowledge.types'
import type {
	HealthKnowledge,
	HealthKnowledgeMetric,
	HealthKnowledgeReportRef,
} from '@/features/health-knowledge/types/health-knowledge-object.types'
import { detectCategoryFromReportTitle } from '@/shared/ai/intent/category-intent.patterns'
import type { HealthToolPayload } from '@/shared/ai/tools/tool.types'
import type { ToolContext } from '@/shared/ai/tools/tool.types'

export function reportRef(
	report: HealthKnowledgeReportRef,
): Record<string, unknown> {
	return {
		id: report.id,
		title: report.title,
		date: report.date,
		lab: report.lab,
		metricCount: report.metricCount,
		badgeStatus: report.badgeStatus,
	}
}

export function metricRef(
	metric: HealthKnowledgeMetric,
): Record<string, unknown> {
	return {
		id: metric.id,
		canonicalId: metric.canonicalId,
		displayName: metric.displayName,
		value: metric.value,
		unit: metric.unit,
		status: metric.status,
		referenceRange: metric.referenceRange,
		confidence: metric.confidence,
		reportId: metric.reportId,
		observedAt: metric.observedAt,
	}
}

export function matchMetrics(
	knowledge: HealthKnowledge,
	metricIds: string[] = [],
	metricNames: string[] = [],
): HealthKnowledgeMetric[] {
	if (metricIds.length === 0 && metricNames.length === 0) {
		return []
	}

	const idSet = new Set(metricIds)
	const nameSet = new Set(metricNames.map((name) => name.toLowerCase()))

	return knowledge.metrics.filter(
		(metric) =>
			idSet.has(metric.canonicalId) ||
			nameSet.has(metric.displayName.toLowerCase()) ||
			[...nameSet].some((name) =>
				metric.displayName.toLowerCase().includes(name),
			),
	)
}

export function latestReportMetrics(
	knowledge: HealthKnowledge,
	limit = 8,
): HealthKnowledgeMetric[] {
	if (!knowledge.latestReport) {
		return []
	}

	return knowledge.metrics
		.filter((metric) => metric.reportId === knowledge.latestReport?.id)
		.sort((a, b) => b.clinicalScore - a.clinicalScore)
		.slice(0, limit)
}

export function topFindings(
	knowledge: HealthKnowledge,
	limit = 6,
): HealthKnowledgeMetric[] {
	return [...knowledge.metrics]
		.sort((a, b) => b.clinicalScore - a.clinicalScore)
		.slice(0, limit)
}

export function allReportRefs(
	knowledge: HealthKnowledge,
): HealthKnowledgeReportRef[] {
	return [
		...(knowledge.latestReport ? [knowledge.latestReport] : []),
		...knowledge.previousReports,
	]
}

export function matchMetricsByCategory(
	knowledge: HealthKnowledge,
	categoryId: MetricCategoryId | string,
): HealthKnowledgeMetric[] {
	return knowledge.metrics
		.filter((metric) => metric.categoryId === categoryId)
		.sort((a, b) => b.clinicalScore - a.clinicalScore)
}

export function reportsForCategory(
	knowledge: HealthKnowledge,
	categoryId: MetricCategoryId | string,
): HealthKnowledgeReportRef[] {
	const metricReportIds = new Set(
		matchMetricsByCategory(knowledge, categoryId).map(
			(metric) => metric.reportId,
		),
	)

	return allReportRefs(knowledge).filter(
		(report) =>
			metricReportIds.has(report.id) ||
			detectCategoryFromReportTitle(report.title) === categoryId,
	)
}

export function reportsWithoutMetrics(
	knowledge: HealthKnowledge,
): HealthKnowledgeReportRef[] {
	return allReportRefs(knowledge).filter((report) => report.metricCount === 0)
}

export function filterMetricsByReportIds(
	knowledge: HealthKnowledge,
	reportIds: string[],
): HealthKnowledgeMetric[] {
	const idSet = new Set(reportIds)
	return knowledge.metrics.filter((metric) => idSet.has(metric.reportId))
}

export function findReportById(
	knowledge: HealthKnowledge,
	reportId: string,
): HealthKnowledgeReportRef | null {
	return (
		allReportRefs(knowledge).find((report) => report.id === reportId) ?? null
	)
}

export function buildToolResult(
	context: ToolContext,
	payload: HealthToolPayload,
): HealthToolPayload {
	return {
		items: payload.items,
		excluded: payload.excluded,
		confidence: payload.confidence ?? context.knowledge.confidence.overall,
	}
}

export async function executeHealthTool(
	toolName: string,
	context: ToolContext,
	input: Record<string, unknown>,
	build: () => HealthToolPayload,
): Promise<{
	success: true
	tool: string
	domain: 'health'
	data: HealthToolPayload
	confidence: number
	executionTimeMs: number
	inputSizeChars: number
	outputSizeChars: number
	retryCount: number
}> {
	const startedAt = Date.now()
	const payload = build()
	const data = buildToolResult(context, payload)

	return {
		success: true,
		tool: toolName,
		domain: 'health',
		data,
		confidence: data.confidence,
		executionTimeMs: Math.max(1, Date.now() - startedAt),
		inputSizeChars: JSON.stringify(input).length,
		outputSizeChars: JSON.stringify(data).length,
		retryCount: 0,
	}
}

export const HEALTH_READ_PERMISSIONS = [
	'read_only',
	'family_member',
	'current_user',
	'admin',
] as const
