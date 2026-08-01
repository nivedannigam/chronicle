import {
	executeHealthTool,
	HEALTH_READ_PERMISSIONS,
	reportRef,
} from '@/shared/ai/tools/health/health-tool.helpers'
import type { ChronicleTool, ToolContext } from '@/shared/ai/tools/tool.types'

export const getLatestReportTool: ChronicleTool = {
	name: 'health.get_latest_report',
	domain: 'health',
	description:
		'Retrieve the most recent health report metadata and its metrics.',
	inputSchema: { type: 'object', properties: {} },
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
	supportedIntents: ['LATEST_REPORT', 'UNKNOWN'],
	async execute(context: ToolContext) {
		return executeHealthTool(getLatestReportTool.name, context, {}, () => {
			const { knowledge } = context
			const items = []

			if (knowledge.latestReport) {
				items.push({
					id: `report-${knowledge.latestReport.id}`,
					type: 'health_report',
					label: knowledge.latestReport.title,
					data: reportRef(knowledge.latestReport),
				})

				const reportMetrics = knowledge.metrics.filter(
					(metric) => metric.reportId === knowledge.latestReport?.id,
				)

				for (const metric of reportMetrics.slice(0, 12)) {
					items.push({
						id: `metric-${metric.id}`,
						type: 'health_metric',
						label: metric.displayName,
						data: {
							id: metric.id,
							displayName: metric.displayName,
							value: metric.value,
							unit: metric.unit,
							status: metric.status,
						},
					})
				}
			}

			items.push({
				id: 'summary',
				type: 'health_summary',
				label: 'Report summary',
				data: {
					headline: knowledge.summary.headline,
					lines: knowledge.summary.lines.slice(0, 3),
				},
			})

			return {
				items,
				excluded: ['previousReports', 'fullTimeline'],
				confidence: knowledge.confidence.overall,
			}
		})
	},
}
