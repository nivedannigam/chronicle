import { describe, expect, it } from 'vitest'
import { healthIntentClassifier } from '@/shared/ai/intent/health-intent-classifier'

describe('HealthIntentClassifier', () => {
	it('classifies general health summary', () => {
		const result = healthIntentClassifier.classify('How is my health overall?')

		expect(result.intent).toBe('GENERAL_HEALTH_SUMMARY')
		expect(result.domain).toBe('health')
	})

	it('classifies latest report', () => {
		const result = healthIntentClassifier.classify(
			'Summarize my latest health report',
		)

		expect(result.intent).toBe('LATEST_REPORT')
	})

	it('classifies explain HbA1c', () => {
		const result = healthIntentClassifier.classify('Explain my HbA1c result')

		expect(result.intent).toBe('EXPLAIN_METRIC')
		expect(result.metricIds).toContain('hba1c')
	})

	it('classifies explain LDL', () => {
		const result = healthIntentClassifier.classify('What does LDL mean?')

		expect(result.intent).toBe('EXPLAIN_METRIC')
		expect(result.metricIds).toContain('ldl')
	})

	it('classifies cholesterol as specific metric', () => {
		const result = healthIntentClassifier.classify('How is my cholesterol?')

		expect(result.intent).toBe('SPECIFIC_METRIC')
		expect(result.metricIds).toEqual(
			expect.arrayContaining(['ldl', 'hdl', 'total-cholesterol']),
		)
	})

	it('classifies abnormal findings', () => {
		const result = healthIntentClassifier.classify(
			'Show me abnormal results that need attention',
		)

		expect(result.intent).toBe('ABNORMAL_RESULTS')
	})

	it('classifies compare reports', () => {
		const result = healthIntentClassifier.classify(
			'What changed since last year?',
		)

		expect(result.intent).toBe('COMPARE_REPORTS')
		expect(result.timeRangeYears).toBe(1)
	})

	it('classifies unknown question', () => {
		const result = healthIntentClassifier.classify(
			'What is the weather in Mumbai?',
		)

		expect(result.intent).toBe('UNKNOWN')
	})

	it('classifies heart organ status with category', () => {
		const result = healthIntentClassifier.classify('How is my heart?')

		expect(result.intent).toBe('GENERAL_HEALTH_SUMMARY')
		expect(result.categoryId).toBe('heart')
	})

	it('classifies how am I doing', () => {
		const result = healthIntentClassifier.classify('How am I doing?')

		expect(result.intent).toBe('GENERAL_HEALTH_SUMMARY')
	})

	it('classifies worry phrasing as abnormal results', () => {
		const result = healthIntentClassifier.classify(
			'Should I be worried about anything?',
		)

		expect(result.intent).toBe('ABNORMAL_RESULTS')
	})

	it('classifies doctor preparation', () => {
		const result = healthIntentClassifier.classify(
			'Prepare me for my next doctor visit.',
		)

		expect(result.intent).toBe('RECOMMENDATIONS')
	})
})
