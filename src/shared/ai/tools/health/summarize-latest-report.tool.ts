import {
	executeHealthTool,
	HEALTH_READ_PERMISSIONS,
	latestReportMetrics,
	reportRef,
} from '@/shared/ai/tools/health/health-tool.helpers'
import type { ChronicleTool, ToolContext } from '@/shared/ai/tools/tool.types'

export const summarizeLatestReportTool: ChronicleTool = {
	name: 'health.summarize_latest_report',
	domain: 'health',
	description:
		'Retrieve the latest health report, its top metrics, summary, and confidence for a general health overview.',
	inputSchema: { type: 'object', properties: {} },
	outputSchema: {
		type: 'object',
		properties: {
			items: { type: 'array', description: 'Evidence items' },
			excluded: { type: 'array', description: 'Excluded knowledge keys' },
			confidence: { type: 'number', description: 'Overall confidence' },
		},
	},
	timeoutMs: 3_000,
	permissions: [...HEALTH_READ_PERMISSIONS],
	estimatedCostUsd: 0,
	supportedIntents: ['GENERAL_HEALTH_SUMMARY', 'LATEST_REPORT'],
	async execute(context: ToolContext) {
		return executeHealthTool(
			summarizeLatestReportTool.name,
			context,
			{},
			() => {
				const { knowledge } = context
				const items = []

				if (knowledge.latestReport) {
					items.push({
						id: `report-${knowledge.latestReport.id}`,
						type: 'health_report',
						label: knowledge.latestReport.title,
						data: reportRef(knowledge.latestReport),
					})
				}

				for (const metric of latestReportMetrics(knowledge, 8)) {
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

				items.push({
					id: 'summary',
					type: 'health_summary',
					label: 'Report summary',
					data: {
						headline: knowledge.summary.headline,
						lines: knowledge.summary.lines.slice(0, 4),
						healthScore: knowledge.healthScore,
					},
				})

				items.push({
					id: 'confidence',
					type: 'confidence',
					label: 'Confidence',
					data: knowledge.confidence as object as Record<string, unknown>,
				})

				return {
					items,
					excluded: ['previousReports', 'fullTimeline', 'allRecommendations'],
					confidence: knowledge.confidence.overall,
				}
			},
		)
	},
}
