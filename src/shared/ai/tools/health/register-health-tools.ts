import { compareReportsTool } from '@/shared/ai/tools/health/compare-reports.tool'
import { getAbnormalMetricsTool } from '@/shared/ai/tools/health/get-abnormal-metrics.tool'
import { getHealthScoreTool } from '@/shared/ai/tools/health/get-health-score.tool'
import { getLatestReportTool } from '@/shared/ai/tools/health/get-latest-report.tool'
import { getMetricHistoryTool } from '@/shared/ai/tools/health/get-metric-history.tool'
import { getTimelineTool } from '@/shared/ai/tools/health/get-timeline.tool'
import { listReportsTool } from '@/shared/ai/tools/health/list-reports.tool'
import { searchMetricsTool } from '@/shared/ai/tools/health/search-metrics.tool'
import { summarizeLatestReportTool } from '@/shared/ai/tools/health/summarize-latest-report.tool'
import {
	defaultToolRegistry,
	type ToolRegistry,
} from '@/shared/ai/tools/tool-registry'

const HEALTH_TOOLS = [
	summarizeLatestReportTool,
	getLatestReportTool,
	getAbnormalMetricsTool,
	searchMetricsTool,
	getMetricHistoryTool,
	compareReportsTool,
	getTimelineTool,
	getHealthScoreTool,
	listReportsTool,
]

export function registerHealthTools(
	registry: ToolRegistry = defaultToolRegistry,
): void {
	for (const tool of HEALTH_TOOLS) {
		if (!registry.has(tool.name)) {
			registry.register(tool)
		}
	}
}

export {
	summarizeLatestReportTool,
	getLatestReportTool,
	getAbnormalMetricsTool,
	searchMetricsTool,
	getMetricHistoryTool,
	compareReportsTool,
	getTimelineTool,
	getHealthScoreTool,
	listReportsTool,
}

// Register on module load for production use
registerHealthTools()
