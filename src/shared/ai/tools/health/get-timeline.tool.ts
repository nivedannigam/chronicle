import {
	executeHealthTool,
	HEALTH_READ_PERMISSIONS,
} from '@/shared/ai/tools/health/health-tool.helpers'
import type { ChronicleTool, ToolContext } from '@/shared/ai/tools/tool.types'

export const getTimelineTool: ChronicleTool = {
	name: 'health.get_timeline',
	domain: 'health',
	description: 'Retrieve chronological health timeline events.',
	inputSchema: {
		type: 'object',
		properties: {
			limit: { type: 'number', description: 'Maximum events' },
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
	supportedIntents: ['TREND_ANALYSIS', 'COMPARE_REPORTS'],
	async execute(context: ToolContext, input: Record<string, unknown> = {}) {
		const limit = typeof input.limit === 'number' ? input.limit : 12

		return executeHealthTool(getTimelineTool.name, context, input, () => {
			const { knowledge } = context
			const items = knowledge.timeline.slice(0, limit).map((event) => ({
				id: `timeline-${event.id}`,
				type: 'timeline_event',
				label: event.title,
				data: event as object as Record<string, unknown>,
			}))

			return {
				items,
				excluded: ['fullMetrics', 'recommendations'],
				confidence: knowledge.confidence.overall,
			}
		})
	},
}
