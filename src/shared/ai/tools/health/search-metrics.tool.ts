import {
	executeHealthTool,
	HEALTH_READ_PERMISSIONS,
	matchMetrics,
	metricRef,
	reportRef,
} from '@/shared/ai/tools/health/health-tool.helpers'
import type { ChronicleTool, ToolContext } from '@/shared/ai/tools/tool.types'

interface SearchMetricsInput {
	metricIds?: string[]
	metricNames?: string[]
	status?: string
	limit?: number
}

export const searchMetricsTool: ChronicleTool = {
	name: 'health.search_metrics',
	domain: 'health',
	description:
		'Search health metrics by name, canonical id, or status filter (normal, abnormal).',
	inputSchema: {
		type: 'object',
		properties: {
			metricIds: { type: 'array', description: 'Canonical metric ids' },
			metricNames: { type: 'array', description: 'Display name fragments' },
			status: { type: 'string', description: 'normal | abnormal | all' },
			limit: { type: 'number', description: 'Maximum results' },
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
	timeoutMs: 2_000,
	permissions: [...HEALTH_READ_PERMISSIONS],
	estimatedCostUsd: 0,
	supportedIntents: ['SPECIFIC_METRIC', 'NORMAL_RESULTS'],
	async execute(context: ToolContext, input: SearchMetricsInput = {}) {
		const metricIds = input.metricIds ?? context.metricIds ?? []
		const metricNames = input.metricNames ?? context.metricNames ?? []
		const status = input.status ?? 'all'
		const limit = input.limit ?? 10

		return executeHealthTool(
			searchMetricsTool.name,
			context,
			input as Record<string, unknown>,
			() => {
				const { knowledge } = context
				let pool = matchMetrics(knowledge, metricIds, metricNames)

				if (pool.length === 0 && status === 'normal') {
					pool = knowledge.normalMetrics
				} else if (pool.length === 0 && status === 'abnormal') {
					pool = knowledge.abnormalMetrics
				} else if (pool.length === 0) {
					pool = knowledge.metrics
				}

				if (status === 'normal') {
					pool = pool.filter((metric) => metric.status === 'normal')
				} else if (status === 'abnormal') {
					pool = pool.filter(
						(metric) =>
							metric.status !== 'normal' && metric.status !== 'unknown',
					)
				}

				const items = pool.slice(0, limit).map((metric) => ({
					id: `metric-${metric.id}`,
					type: 'health_metric',
					label: metric.displayName,
					data: metricRef(metric),
				}))

				const reportId = pool[0]?.reportId ?? knowledge.latestReport?.id
				const report =
					knowledge.latestReport?.id === reportId
						? knowledge.latestReport
						: knowledge.previousReports.find((item) => item.id === reportId)

				if (report) {
					items.push({
						id: `report-${report.id}`,
						type: 'health_report',
						label: report.title,
						data: reportRef(report),
					})
				}

				return {
					items,
					excluded: ['unrelatedMetrics', 'previousReports', 'fullTimeline'],
					confidence: knowledge.confidence.overall,
				}
			},
		)
	},
}
