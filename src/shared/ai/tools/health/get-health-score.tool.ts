import {
	executeHealthTool,
	HEALTH_READ_PERMISSIONS,
	topFindings,
} from '@/shared/ai/tools/health/health-tool.helpers'
import type { ChronicleTool, ToolContext } from '@/shared/ai/tools/tool.types'

export const getHealthScoreTool: ChronicleTool = {
	name: 'health.get_health_score',
	domain: 'health',
	description:
		'Retrieve the computed health score and supporting top findings.',
	inputSchema: { type: 'object', properties: {} },
	outputSchema: {
		type: 'object',
		properties: {
			items: { type: 'array' },
			excluded: { type: 'array' },
			confidence: { type: 'number' },
		},
	},
	timeoutMs: 1_500,
	permissions: [...HEALTH_READ_PERMISSIONS],
	estimatedCostUsd: 0,
	supportedIntents: ['GENERAL_HEALTH_SUMMARY'],
	async execute(context: ToolContext) {
		return executeHealthTool(getHealthScoreTool.name, context, {}, () => {
			const { knowledge } = context
			const items: Array<{
				id: string
				type: string
				label: string
				data: Record<string, unknown>
			}> = [
				{
					id: 'health-score',
					type: 'health_score',
					label: 'Health score',
					data: {
						score: knowledge.healthScore,
						summary: knowledge.summary.headline,
					},
				},
				{
					id: 'confidence',
					type: 'confidence',
					label: 'Confidence',
					data: {
						overall: knowledge.confidence.overall,
						dataCompleteness: knowledge.confidence.dataCompleteness,
					},
				},
			]

			for (const metric of topFindings(knowledge, 3)) {
				items.push({
					id: `metric-${metric.id}`,
					type: 'health_metric',
					label: metric.displayName,
					data: {
						displayName: metric.displayName,
						value: metric.value,
						status: metric.status,
					},
				})
			}

			return {
				items,
				excluded: ['fullTimeline', 'previousReports', 'allMetrics'],
				confidence: knowledge.confidence.overall,
			}
		})
	},
}
