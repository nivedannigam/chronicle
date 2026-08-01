import {
	executeHealthTool,
	HEALTH_READ_PERMISSIONS,
	metricRef,
	reportRef,
} from '@/shared/ai/tools/health/health-tool.helpers'
import type { ChronicleTool, ToolContext } from '@/shared/ai/tools/tool.types'

export const getAbnormalMetricsTool: ChronicleTool = {
	name: 'health.get_abnormal_metrics',
	domain: 'health',
	description:
		'Retrieve abnormal, borderline, and critical metrics plus related recommendations.',
	inputSchema: {
		type: 'object',
		properties: {
			limit: { type: 'number', description: 'Maximum metrics to return' },
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
	supportedIntents: ['ABNORMAL_RESULTS', 'RECOMMENDATIONS', 'FOLLOW_UP_TESTS'],
	async execute(context: ToolContext, input: Record<string, unknown>) {
		const limit = typeof input.limit === 'number' ? input.limit : 10

		return executeHealthTool(
			getAbnormalMetricsTool.name,
			context,
			input,
			() => {
				const { knowledge } = context
				const items = []

				for (const metric of knowledge.abnormalMetrics.slice(0, limit)) {
					items.push({
						id: `metric-${metric.id}`,
						type: 'health_metric',
						label: metric.displayName,
						data: metricRef(metric),
					})
				}

				for (const rec of knowledge.recommendations.slice(0, 4)) {
					items.push({
						id: `rec-${rec.id}`,
						type: 'recommendation',
						label: rec.text,
						data: rec as object as Record<string, unknown>,
					})
				}

				if (knowledge.latestReport) {
					items.push({
						id: `report-${knowledge.latestReport.id}`,
						type: 'health_report',
						label: knowledge.latestReport.title,
						data: reportRef(knowledge.latestReport),
					})
				}

				return {
					items,
					excluded: ['normalMetrics', 'previousReports', 'fullTrendAnalysis'],
					confidence: knowledge.confidence.overall,
				}
			},
		)
	},
}
