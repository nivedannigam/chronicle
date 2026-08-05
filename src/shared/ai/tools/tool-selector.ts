import type { ChronicleIntent } from '@/shared/ai/intent/intent.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'
import type { ToolSelection } from '@/shared/ai/tools/tool.types'
import { defaultToolRegistry } from '@/shared/ai/tools/tool-registry'

const HEALTH_INTENT_TOOL_MAP: Record<ChronicleIntent, string> = {
	GENERAL_HEALTH_SUMMARY: 'health.get_health_overview',
	LATEST_REPORT: 'health.get_latest_report',
	ABNORMAL_RESULTS: 'health.get_abnormal_metrics',
	NORMAL_RESULTS: 'health.search_metrics',
	SPECIFIC_METRIC: 'health.search_metrics',
	TREND_ANALYSIS: 'health.get_metric_history',
	COMPARE_REPORTS: 'health.compare_reports',
	RECOMMENDATIONS: 'health.get_health_overview',
	FOLLOW_UP_TESTS: 'health.get_abnormal_metrics',
	EXPLAIN_METRIC: 'health.get_metric_history',
	UNKNOWN: 'health.get_health_overview',
}

export function selectToolForIntent(input: {
	intent: ChronicleIntent
	domain: KnowledgeDomainId
	metricIds?: string[]
	metricNames?: string[]
	timeRangeYears?: number
	categoryId?: string
	reportId?: string
	reportIds?: string[]
}): ToolSelection {
	if (input.domain !== 'health') {
		throw new Error(
			`Tool selection is not implemented for domain "${input.domain}".`,
		)
	}

	if (input.reportId || (input.reportIds?.length ?? 0) > 0) {
		const toolName = 'health.get_scoped_report'
		defaultToolRegistry.require(toolName)

		return {
			toolName,
			input: {
				reportId: input.reportId,
				reportIds: input.reportIds,
			},
			reason: 'scoped report or visit context',
		}
	}

	if (
		input.categoryId &&
		!(input.metricIds?.length ?? 0) &&
		!(input.metricNames?.length ?? 0)
	) {
		const toolName = 'health.get_category_metrics'
		defaultToolRegistry.require(toolName)

		return {
			toolName,
			input: { categoryId: input.categoryId },
			reason: `category ${input.categoryId}`,
		}
	}

	if (input.intent === 'COMPARE_REPORTS') {
		const toolName = 'health.compare_reports'
		defaultToolRegistry.require(toolName)

		return {
			toolName,
			input: {
				metricIds: input.metricIds,
				metricNames: input.metricNames,
				timeRangeYears: input.timeRangeYears,
			},
			reason: 'compare reports with timeline context',
		}
	}

	if (input.intent === 'TREND_ANALYSIS') {
		const toolName = 'health.get_timeline'
		defaultToolRegistry.require(toolName)

		if (input.metricIds?.length || input.metricNames?.length) {
			return {
				toolName: 'health.get_metric_history',
				input: {
					metricIds: input.metricIds,
					metricNames: input.metricNames,
					timeRangeYears: input.timeRangeYears,
				},
				reason: 'metric trend with history',
			}
		}

		return {
			toolName,
			input: { limit: 12 },
			reason: 'timeline for trend phrasing',
		}
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
