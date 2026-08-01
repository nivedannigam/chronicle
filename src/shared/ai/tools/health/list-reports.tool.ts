import {
	executeHealthTool,
	HEALTH_READ_PERMISSIONS,
	reportRef,
} from '@/shared/ai/tools/health/health-tool.helpers'
import type { ChronicleTool, ToolContext } from '@/shared/ai/tools/tool.types'

export const listReportsTool: ChronicleTool = {
	name: 'health.list_reports',
	domain: 'health',
	description: 'List all available health reports for the current member.',
	inputSchema: {
		type: 'object',
		properties: {
			limit: { type: 'number', description: 'Maximum reports' },
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
	supportedIntents: ['COMPARE_REPORTS', 'LATEST_REPORT'],
	async execute(context: ToolContext, input: Record<string, unknown> = {}) {
		const limit = typeof input.limit === 'number' ? input.limit : 10

		return executeHealthTool(listReportsTool.name, context, input, () => {
			const { knowledge } = context
			const reports = [
				...(knowledge.latestReport ? [knowledge.latestReport] : []),
				...knowledge.previousReports,
			]

			const items = reports.slice(0, limit).map((report) => ({
				id: `report-${report.id}`,
				type: 'health_report',
				label: report.title,
				data: reportRef(report),
			}))

			return {
				items,
				excluded: ['fullMetrics', 'timeline', 'recommendations'],
				confidence: knowledge.confidence.overall,
			}
		})
	},
}
