import type { ChronicleIntent } from '@/shared/ai/intent/intent.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'
import type { ToolSelection } from '@/shared/ai/tools/tool.types'
import { defaultToolRegistry } from '@/shared/ai/tools/tool-registry'

const HEALTH_INTENT_TOOL_MAP: Record<ChronicleIntent, string> = {
	GENERAL_HEALTH_SUMMARY: 'health.summarize_latest_report',
	LATEST_REPORT: 'health.get_latest_report',
	ABNORMAL_RESULTS: 'health.get_abnormal_metrics',
	NORMAL_RESULTS: 'health.search_metrics',
	SPECIFIC_METRIC: 'health.search_metrics',
	TREND_ANALYSIS: 'health.get_metric_history',
	COMPARE_REPORTS: 'health.compare_reports',
	RECOMMENDATIONS: 'health.get_abnormal_metrics',
	FOLLOW_UP_TESTS: 'health.get_abnormal_metrics',
	EXPLAIN_METRIC: 'health.get_metric_history',
	UNKNOWN: 'health.get_latest_report',
}

export function selectToolForIntent(input: {
	intent: ChronicleIntent
	domain: KnowledgeDomainId
	metricIds?: string[]
	metricNames?: string[]
	timeRangeYears?: number
}): ToolSelection {
	if (input.domain !== 'health') {
		throw new Error(
			`Tool selection is not implemented for domain "${input.domain}".`,
		)
	}

	const toolName = HEALTH_INTENT_TOOL_MAP[input.intent]
	defaultToolRegistry.require(toolName)

	const toolInput: Record<string, unknown> = {}

	if (input.metricIds?.length) {
		toolInput.metricIds = input.metricIds
	}

	if (input.metricNames?.length) {
		toolInput.metricNames = input.metricNames
	}

	if (input.timeRangeYears != null) {
		toolInput.timeRangeYears = input.timeRangeYears
	}

	if (input.intent === 'NORMAL_RESULTS') {
		toolInput.status = 'normal'
	}

	if (input.intent === 'ABNORMAL_RESULTS') {
		toolInput.status = 'abnormal'
	}

	return {
		toolName,
		input: toolInput,
		reason: `intent ${input.intent} maps to ${toolName}`,
	}
}

export function listToolsForIntent(
	intent: ChronicleIntent,
	domain: KnowledgeDomainId,
) {
	return defaultToolRegistry.getForIntent(intent, domain)
}

export { HEALTH_INTENT_TOOL_MAP }
