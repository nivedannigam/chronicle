import { describe, expect, it } from 'vitest'
import {
	buildAnswerContext,
	filterFollowUpQuestions,
} from '@/features/ask/utils/follow-up-questions.utils'
import type { StructuredAskResponse } from '@/features/ask/types/structured-response.types'

function sampleStructured(
	overrides: Partial<StructuredAskResponse> = {},
): StructuredAskResponse {
	return {
		directAnswer:
			'Overall your heart health looks good. Your cholesterol has improved since last year.',
		keyFindings: ['Your lipid panel is in a healthy range.'],
		evidenceFromReports: ['Your lipid panel is in a healthy range.'],
		recommendations: ['Keep up regular exercise and a balanced diet.'],
		limitations: [],
		hasEvidence: true,
		relatedQuestions: [],
		confidenceLevel: 'high',
		uncertaintyNote: null,
		showSafetyFooter: false,
		explanation: null,
		...overrides,
	}
}

describe('filterFollowUpQuestions', () => {
	it('removes generic Explain LDL when LDL was not discussed', () => {
		const context = buildAnswerContext(sampleStructured())
		const filtered = filterFollowUpQuestions(
			['Explain LDL', 'How can I improve my heart health further?'],
			context,
		)

		expect(filtered).not.toContain('Explain LDL')
		expect(filtered).toContain('How can I improve my heart health further?')
	})

	it('keeps Explain LDL when LDL appears in the answer', () => {
		const structured = sampleStructured({
			directAnswer: 'Your LDL is slightly above the ideal range.',
			keyFindings: ['LDL cholesterol is 130 mg/dL.'],
		})
		const context = buildAnswerContext(structured)
		const filtered = filterFollowUpQuestions(
			['Explain LDL', 'Show my cholesterol trend'],
			context,
		)

		expect(filtered).toContain('Explain LDL')
	})

	it('filters trust debug prompts', () => {
		const context = buildAnswerContext(sampleStructured())
		const filtered = filterFollowUpQuestions(
			['Why did you say that?', 'What should I ask my doctor?'],
			context,
		)

		expect(filtered).not.toContain('Why did you say that?')
		expect(filtered).toContain('What should I ask my doctor?')
	})

	it('deduplicates questions case-insensitively', () => {
		const context = buildAnswerContext(sampleStructured())
		const filtered = filterFollowUpQuestions(
			[
				'Show my cholesterol trend',
				'show my cholesterol trend',
				'Compare with last year',
			],
			context,
		)

		expect(filtered).toHaveLength(2)
	})
})
