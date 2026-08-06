import { describe, expect, it } from 'vitest'
import { resolveQuestionType } from '@/shared/ai/evidence-planning/question-type.resolver'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'

function intent(partial: Partial<ClassifiedIntent>): ClassifiedIntent {
	return {
		intent: 'GENERAL_HEALTH_SUMMARY',
		domain: 'health',
		confidence: 0.9,
		metricIds: [],
		metricNames: [],
		reasons: [],
		...partial,
	}
}

describe('resolveQuestionType', () => {
	it('maps organ status questions to STATUS_OVERVIEW', () => {
		expect(
			resolveQuestionType({
				question: 'How is my heart health?',
				intent: intent({
					intent: 'GENERAL_HEALTH_SUMMARY',
					categoryId: 'heart',
				}),
			}),
		).toBe('STATUS_OVERVIEW')
	})

	it('maps latest report intent to LATEST_REPORT', () => {
		expect(
			resolveQuestionType({
				question: 'Summarize my latest health report',
				intent: intent({ intent: 'LATEST_REPORT' }),
			}),
		).toBe('LATEST_REPORT')
	})

	it('maps fact lookup phrasing to FACT_LOOKUP', () => {
		expect(
			resolveQuestionType({
				question: 'What is my LDL?',
				intent: intent({
					intent: 'SPECIFIC_METRIC',
					metricNames: ['LDL'],
				}),
			}),
		).toBe('FACT_LOOKUP')
	})

	it('maps trend intent to TREND', () => {
		expect(
			resolveQuestionType({
				question: 'How has my HbA1c changed over time?',
				intent: intent({ intent: 'TREND_ANALYSIS' }),
			}),
		).toBe('TREND')
	})
})
