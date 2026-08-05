import { describe, expect, it } from 'vitest'
import { selectToolForIntent } from '@/shared/ai/tools/tool-selector'
import { registerHealthTools } from '@/shared/ai/tools/health/register-health-tools'

describe('ToolSelector', () => {
	it('maps general health summary to health overview', () => {
		registerHealthTools()

		const selection = selectToolForIntent({
			intent: 'GENERAL_HEALTH_SUMMARY',
			domain: 'health',
		})

		expect(selection.toolName).toBe('health.get_health_overview')
	})

	it('maps category questions to category metrics tool', () => {
		registerHealthTools()

		const selection = selectToolForIntent({
			intent: 'GENERAL_HEALTH_SUMMARY',
			domain: 'health',
			categoryId: 'heart',
		})

		expect(selection.toolName).toBe('health.get_category_metrics')
		expect(selection.input.categoryId).toBe('heart')
	})

	it('maps scoped report context', () => {
		registerHealthTools()

		const selection = selectToolForIntent({
			intent: 'LATEST_REPORT',
			domain: 'health',
			reportId: 'report-1',
		})

		expect(selection.toolName).toBe('health.get_scoped_report')
	})

	it('maps abnormal results to get_abnormal_metrics', () => {
		registerHealthTools()

		const selection = selectToolForIntent({
			intent: 'ABNORMAL_RESULTS',
			domain: 'health',
		})

		expect(selection.toolName).toBe('health.get_abnormal_metrics')
		expect(selection.input.status).toBe('abnormal')
	})

	it('maps specific metric to search_metrics', () => {
		const selection = selectToolForIntent({
			intent: 'SPECIFIC_METRIC',
			domain: 'health',
			metricIds: ['ldl'],
		})

		expect(selection.toolName).toBe('health.search_metrics')
		expect(selection.input.metricIds).toEqual(['ldl'])
	})

	it('maps compare reports to compare_reports tool', () => {
		const selection = selectToolForIntent({
			intent: 'COMPARE_REPORTS',
			domain: 'health',
			timeRangeYears: 1,
		})

		expect(selection.toolName).toBe('health.compare_reports')
		expect(selection.input.timeRangeYears).toBe(1)
	})
})
