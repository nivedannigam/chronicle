import {
	allReportRefs,
	executeHealthTool,
	filterMetricsByReportIds,
	findReportById,
	HEALTH_READ_PERMISSIONS,
	matchMetricsByCategory,
	metricRef,
	reportRef,
	reportsForCategory,
	reportsWithoutMetrics,
	topFindings,
} from '@/shared/ai/tools/health/health-tool.helpers'
import type {
	ChronicleTool,
	HealthToolPayload,
	ToolContext,
} from '@/shared/ai/tools/tool.types'

export const getCategoryMetricsTool: ChronicleTool = {
	name: 'health.get_category_metrics',
	domain: 'health',
	description:
		'Retrieve metrics and reports for a health category (heart, liver, kidney, etc.) across all visits.',
	inputSchema: {
		type: 'object',
		properties: {
			categoryId: { type: 'string', description: 'Category id' },
			limit: { type: 'number', description: 'Maximum metrics' },
		},
		required: ['categoryId'],
	},
	outputSchema: {
		type: 'object',
		properties: {
			items: { type: 'array' },
			excluded: { type: 'array' },
			confidence: { type: 'number' },
		},
	},
	timeoutMs: 3_000,
	permissions: [...HEALTH_READ_PERMISSIONS],
	estimatedCostUsd: 0,
	supportedIntents: [
		'GENERAL_HEALTH_SUMMARY',
		'SPECIFIC_METRIC',
		'TREND_ANALYSIS',
		'COMPARE_REPORTS',
	],
	async execute(context: ToolContext, input: Record<string, unknown> = {}) {
		const categoryId =
			(typeof input.categoryId === 'string' ? input.categoryId : null) ??
			context.categoryId

		if (!categoryId) {
			throw new Error('categoryId is required for health.get_category_metrics')
		}

		const limit = typeof input.limit === 'number' ? input.limit : 12

		return executeHealthTool(
			getCategoryMetricsTool.name,
			context,
			input,
			() => {
				const { knowledge } = context
				const scopedReportIds = context.reportIds?.length
					? new Set(context.reportIds)
					: null

				let metrics = matchMetricsByCategory(knowledge, categoryId)

				if (scopedReportIds) {
					metrics = metrics.filter((metric) =>
						scopedReportIds.has(metric.reportId),
					)
				}

				const reports = reportsForCategory(knowledge, categoryId).filter(
					(report) => !scopedReportIds || scopedReportIds.has(report.id),
				)

				const items: HealthToolPayload['items'] = []

				for (const report of reports.slice(0, 6)) {
					items.push({
						id: `report-${report.id}`,
						type: 'health_report',
						label: report.title,
						data: reportRef(report),
					})
				}

				for (const metric of metrics.slice(0, limit)) {
					items.push({
						id: `metric-${metric.id}`,
						type: 'health_metric',
						label: metric.displayName,
						data: metricRef(metric),
					})
				}

				if (metrics.length === 0 && reports.length > 0) {
					items.push({
						id: `category-${categoryId}-context`,
						type: 'category_context',
						label: `${categoryId} reports`,
						data: {
							categoryId,
							reportCount: reports.length,
							note: 'Reports found without structured lab metrics — narrative may rely on report metadata.',
						},
					})
				}

				return {
					items,
					excluded: ['unrelatedCategories', 'fullTimeline'],
					confidence: knowledge.confidence.overall,
				}
			},
		)
	},
}

export const getHealthOverviewTool: ChronicleTool = {
	name: 'health.get_health_overview',
	domain: 'health',
	description:
		'Broad health overview: score, abnormal findings, timeline, and report inventory across all visits.',
	inputSchema: { type: 'object', properties: {} },
	outputSchema: {
		type: 'object',
		properties: {
			items: { type: 'array' },
			excluded: { type: 'array' },
			confidence: { type: 'number' },
		},
	},
	timeoutMs: 4_000,
	permissions: [...HEALTH_READ_PERMISSIONS],
	estimatedCostUsd: 0,
	supportedIntents: ['GENERAL_HEALTH_SUMMARY', 'UNKNOWN', 'RECOMMENDATIONS'],
	async execute(context: ToolContext) {
		return executeHealthTool(getHealthOverviewTool.name, context, {}, () => {
			const { knowledge } = context
			const items: HealthToolPayload['items'] = []

			items.push({
				id: 'health-score',
				type: 'health_score',
				label: 'Health score',
				data: {
					score: knowledge.healthScore,
					headline: knowledge.summary.headline,
					lines: knowledge.summary.lines.slice(0, 4),
				},
			})

			for (const metric of knowledge.abnormalMetrics.slice(0, 8)) {
				items.push({
					id: `metric-${metric.id}`,
					type: 'health_metric',
					label: metric.displayName,
					data: metricRef(metric),
				})
			}

			if (knowledge.abnormalMetrics.length === 0) {
				for (const metric of topFindings(knowledge, 5)) {
					items.push({
						id: `metric-${metric.id}`,
						type: 'health_metric',
						label: metric.displayName,
						data: metricRef(metric),
					})
				}
			}

			for (const report of allReportRefs(knowledge).slice(0, 6)) {
				items.push({
					id: `report-${report.id}`,
					type: 'health_report',
					label: report.title,
					data: reportRef(report),
				})
			}

			for (const report of reportsWithoutMetrics(knowledge).slice(0, 3)) {
				if (items.some((item) => item.id === `report-${report.id}`)) {
					continue
				}

				items.push({
					id: `report-${report.id}`,
					type: 'health_report',
					label: report.title,
					data: {
						...reportRef(report),
						metricless: true,
					},
				})
			}

			for (const event of knowledge.timeline.slice(0, 6)) {
				items.push({
					id: `timeline-${event.id}`,
					type: 'timeline_event',
					label: event.title,
					data: event as object as Record<string, unknown>,
				})
			}

			for (const rec of knowledge.recommendations.slice(0, 3)) {
				items.push({
					id: `rec-${rec.id}`,
					type: 'recommendation',
					label: rec.text,
					data: rec as object as Record<string, unknown>,
				})
			}

			return {
				items,
				excluded: ['fullMetricHistory', 'rawOcrText'],
				confidence: knowledge.confidence.overall,
			}
		})
	},
}

export const getScopedReportTool: ChronicleTool = {
	name: 'health.get_scoped_report',
	domain: 'health',
	description:
		'Retrieve metrics and context for a specific health report or visit.',
	inputSchema: {
		type: 'object',
		properties: {
			reportId: { type: 'string', description: 'Report id' },
			reportIds: { type: 'array', description: 'Report ids for a visit' },
		},
	},
	outputSchema: {
		type: 'object',
		properties: {
			items: { type: 'array' },
			excluded: { type: 'array' },
			confidence: { type: 'number' },
		},
	},
	timeoutMs: 3_000,
	permissions: [...HEALTH_READ_PERMISSIONS],
	estimatedCostUsd: 0,
	supportedIntents: [
		'LATEST_REPORT',
		'GENERAL_HEALTH_SUMMARY',
		'SPECIFIC_METRIC',
		'UNKNOWN',
	],
	async execute(context: ToolContext, input: Record<string, unknown> = {}) {
		const reportIds =
			(Array.isArray(input.reportIds)
				? input.reportIds.filter((id): id is string => typeof id === 'string')
				: null) ??
			context.reportIds ??
			(typeof input.reportId === 'string'
				? [input.reportId]
				: context.reportId
					? [context.reportId]
					: [])

		return executeHealthTool(getScopedReportTool.name, context, input, () => {
			const { knowledge } = context
			const items: HealthToolPayload['items'] = []

			for (const reportId of reportIds) {
				const report = findReportById(knowledge, reportId)

				if (!report) {
					continue
				}

				items.push({
					id: `report-${report.id}`,
					type: 'health_report',
					label: report.title,
					data: reportRef(report),
				})

				const metrics = filterMetricsByReportIds(knowledge, [reportId])

				for (const metric of metrics.slice(0, 10)) {
					items.push({
						id: `metric-${metric.id}`,
						type: 'health_metric',
						label: metric.displayName,
						data: metricRef(metric),
					})
				}

				if (metrics.length === 0) {
					items.push({
						id: `report-context-${report.id}`,
						type: 'report_context',
						label: report.title,
						data: {
							reportId: report.id,
							title: report.title,
							date: report.date,
							metricless: true,
						},
					})
				}
			}

			return {
				items,
				excluded: ['otherReports', 'fullTimeline'],
				confidence: knowledge.confidence.overall,
			}
		})
	},
}
