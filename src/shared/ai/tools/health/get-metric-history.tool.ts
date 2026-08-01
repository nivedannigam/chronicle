import {
	executeHealthTool,
	HEALTH_READ_PERMISSIONS,
	matchMetrics,
	metricRef,
} from '@/shared/ai/tools/health/health-tool.helpers'
import type { ChronicleTool, ToolContext } from '@/shared/ai/tools/tool.types'

interface MetricHistoryInput {
	metricIds?: string[]
	metricNames?: string[]
	limit?: number
}

export const getMetricHistoryTool: ChronicleTool = {
	name: 'health.get_metric_history',
	domain: 'health',
	description:
		'Retrieve historical values and trend analysis for one or more metrics.',
	inputSchema: {
		type: 'object',
		properties: {
			metricIds: { type: 'array', description: 'Canonical metric ids' },
			metricNames: { type: 'array', description: 'Display name fragments' },
			limit: { type: 'number', description: 'Maximum trend points' },
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
	supportedIntents: ['TREND_ANALYSIS', 'EXPLAIN_METRIC'],
	async execute(context: ToolContext, input: MetricHistoryInput = {}) {
		const metricIds = input.metricIds ?? context.metricIds ?? []
		const metricNames = input.metricNames ?? context.metricNames ?? []
		const limit = input.limit ?? 6

		return executeHealthTool(
			getMetricHistoryTool.name,
			context,
			input as Record<string, unknown>,
			() => {
				const { knowledge } = context
				const matched = matchMetrics(knowledge, metricIds, metricNames)
				const items = []

				const trends =
					matched.length > 0
						? knowledge.trendAnalysis.filter((trend) =>
								matched.some((metric) => metric.canonicalId === trend.metricId),
							)
						: knowledge.trendAnalysis.filter((trend) => trend.isActionable)

				for (const trend of trends.slice(0, limit)) {
					items.push({
						id: `trend-${trend.metricId}`,
						type: 'trend',
						label: trend.displayName,
						data: trend as object as Record<string, unknown>,
					})
				}

				for (const metric of matched.slice(0, 4)) {
					items.push({
						id: `metric-${metric.id}`,
						type: 'health_metric',
						label: metric.displayName,
						data: metricRef(metric),
					})
				}

				return {
					items,
					excluded: ['staticSnapshotOnly', 'recommendations', 'fullReportList'],
					confidence: knowledge.confidence.overall,
				}
			},
		)
	},
}
