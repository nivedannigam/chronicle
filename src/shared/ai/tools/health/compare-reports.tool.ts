import {
	executeHealthTool,
	HEALTH_READ_PERMISSIONS,
	matchMetrics,
	metricRef,
	reportRef,
} from '@/shared/ai/tools/health/health-tool.helpers'
import type { ChronicleTool, ToolContext } from '@/shared/ai/tools/tool.types'

export const compareReportsTool: ChronicleTool = {
	name: 'health.compare_reports',
	domain: 'health',
	description:
		'Compare the latest report with previous reports and highlight changed metrics.',
	inputSchema: {
		type: 'object',
		properties: {
			timeRangeYears: {
				type: 'number',
				description: 'Comparison window in years',
			},
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
	supportedIntents: ['COMPARE_REPORTS'],
	async execute(context: ToolContext, input: Record<string, unknown> = {}) {
		return executeHealthTool(compareReportsTool.name, context, input, () => {
			const { knowledge } = context
			const items = []
			const matched = matchMetrics(
				knowledge,
				context.metricIds ?? [],
				context.metricNames ?? [],
			)

			if (knowledge.latestReport) {
				items.push({
					id: `report-${knowledge.latestReport.id}`,
					type: 'health_report',
					label: knowledge.latestReport.title,
					data: reportRef(knowledge.latestReport),
				})
			}

			for (const report of knowledge.previousReports.slice(0, 3)) {
				items.push({
					id: `report-${report.id}`,
					type: 'health_report',
					label: report.title,
					data: reportRef(report),
				})
			}

			const comparableTrends = knowledge.trendAnalysis.filter(
				(trend) => trend.dataPointCount >= 2,
			)

			for (const trend of comparableTrends.slice(0, 8)) {
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
				excluded: ['normalMetrics', 'qualitativeOnly', 'fullInsights'],
				confidence: knowledge.confidence.overall,
			}
		})
	},
}
