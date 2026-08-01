import type { HealthToolPayload } from '@/shared/ai/tools/tool.types'
import { describe, expect, it } from 'vitest'
import { registerHealthTools } from '@/shared/ai/tools/health/register-health-tools'
import { defaultToolExecutor } from '@/shared/ai/tools/tool-executor'
import {
	buildKnowledge,
	buildToolContext,
	storedMetric,
} from '@/shared/ai/tools/health/__tests__/health-tool.fixtures'
import { report } from '@/shared/ai/tools/health/__tests__/health-tool.fixtures'

describe('Health tools', () => {
	registerHealthTools()

	it('GetAbnormalMetrics returns abnormal metrics only', async () => {
		const knowledge = buildKnowledge({
			storedMetrics: [
				storedMetric({ status: 'high', value: '160' }),
				storedMetric({
					id: 'metric-hba1c',
					canonical_metric_id: 'hba1c',
					display_name: 'HbA1c',
					value: '6.4',
					status: 'high',
				}),
			],
		})

		const result = await defaultToolExecutor.execute<HealthToolPayload>(
			'health.get_abnormal_metrics',
			buildToolContext(knowledge, {
				question: 'What were my abnormal findings?',
				intent: 'ABNORMAL_RESULTS',
			}),
		)

		expect(result.data.excluded).toContain('normalMetrics')
		expect(
			result.data.items.some((item) => item.type === 'health_metric'),
		).toBe(true)
	})

	it('SearchMetrics filters cholesterol metrics', async () => {
		const knowledge = buildKnowledge()
		const result = await defaultToolExecutor.execute<HealthToolPayload>(
			'health.search_metrics',
			buildToolContext(knowledge, {
				question: 'How is my cholesterol?',
				intent: 'SPECIFIC_METRIC',
				metricIds: ['ldl', 'hdl', 'total-cholesterol'],
			}),
			{ metricIds: ['ldl', 'hdl', 'total-cholesterol'] },
		)

		expect(
			result.data.items.filter((item) => item.type === 'health_metric').length,
		).toBeGreaterThan(0)
		expect(result.data.excluded).toContain('unrelatedMetrics')
	})

	it('GetMetricHistory returns trends for HbA1c', async () => {
		const knowledge = buildKnowledge()
		const result = await defaultToolExecutor.execute<HealthToolPayload>(
			'health.get_metric_history',
			buildToolContext(knowledge, {
				question: 'Explain my HbA1c',
				intent: 'EXPLAIN_METRIC',
				metricIds: ['hba1c'],
			}),
			{ metricIds: ['hba1c'] },
		)

		expect(result.tool).toBe('health.get_metric_history')
	})

	it('CompareReports includes multiple reports', async () => {
		const knowledge = buildKnowledge({
			uploadedReports: [
				report({
					id: 'report-old',
					report_date: '2025-01-01',
					uploaded_at: '2025-01-01T00:00:00.000Z',
				}),
				report({ id: 'report-new' }),
			],
			storedMetrics: [
				storedMetric({ report_id: 'report-old' }),
				storedMetric({ id: 'metric-new', report_id: 'report-new' }),
			],
		})

		const result = await defaultToolExecutor.execute<HealthToolPayload>(
			'health.compare_reports',
			buildToolContext(knowledge, {
				question: 'What changed since last year?',
				intent: 'COMPARE_REPORTS',
			}),
		)

		expect(
			result.data.items.filter((item) => item.type === 'health_report').length,
		).toBeGreaterThan(0)
	})

	it('GetLatestReport returns latest report evidence', async () => {
		const result = await defaultToolExecutor.execute<HealthToolPayload>(
			'health.get_latest_report',
			buildToolContext(buildKnowledge(), {
				question: 'Summarize my latest report',
				intent: 'LATEST_REPORT',
			}),
		)

		expect(
			result.data.items.some((item) => item.type === 'health_report'),
		).toBe(true)
	})

	it('SummarizeLatestReport includes summary and confidence', async () => {
		const result = await defaultToolExecutor.execute<HealthToolPayload>(
			'health.summarize_latest_report',
			buildToolContext(buildKnowledge(), {
				question: 'How is my health overall?',
				intent: 'GENERAL_HEALTH_SUMMARY',
			}),
		)

		expect(
			result.data.items.some((item) => item.type === 'health_summary'),
		).toBe(true)
		expect(result.data.items.some((item) => item.type === 'confidence')).toBe(
			true,
		)
	})

	it('GetHealthScore returns score payload', async () => {
		const result = await defaultToolExecutor.execute<HealthToolPayload>(
			'health.get_health_score',
			buildToolContext(buildKnowledge(), {
				intent: 'GENERAL_HEALTH_SUMMARY',
			}),
		)

		expect(result.data.items.some((item) => item.type === 'health_score')).toBe(
			true,
		)
	})

	it('ListReports lists available reports', async () => {
		const result = await defaultToolExecutor.execute<HealthToolPayload>(
			'health.list_reports',
			buildToolContext(buildKnowledge(), { intent: 'COMPARE_REPORTS' }),
		)

		expect(
			result.data.items.every((item) => item.type === 'health_report'),
		).toBe(true)
	})

	it('GetTimeline returns timeline events', async () => {
		const result = await defaultToolExecutor.execute<HealthToolPayload>(
			'health.get_timeline',
			buildToolContext(buildKnowledge(), { intent: 'TREND_ANALYSIS' }),
		)

		expect(
			result.data.items.some((item) => item.type === 'timeline_event'),
		).toBe(true)
	})
})
