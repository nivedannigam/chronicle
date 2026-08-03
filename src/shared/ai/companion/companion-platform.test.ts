import { describe, expect, it } from 'vitest'
import {
	buildConversationMemoryContext,
	formatMemoryContextForPrompt,
} from '@/shared/ai/context/companion-context.builder'
import { normalizeCompanionResponse } from '@/shared/ai/response/companion-response.normalizer'

describe('companion-context.builder', () => {
	it('builds continuity hints from recent turns', () => {
		const context = buildConversationMemoryContext([
			{
				question: 'How is my Vitamin D?',
				answer: 'It is low.',
				metricName: 'Vitamin D',
			},
			{
				question: 'What about cholesterol?',
				answer: 'LDL improved.',
				metricName: 'LDL',
			},
		])

		expect(context.continuityHints.length).toBeGreaterThan(0)
		expect(formatMemoryContextForPrompt(context)).toContain(
			'ConversationMemory',
		)
	})

	it('returns empty prompt block when no memory exists', () => {
		expect(
			formatMemoryContextForPrompt(buildConversationMemoryContext([])),
		).toBe('')
	})
})

describe('companion-response.normalizer', () => {
	it('maps legacy fields into companion sections', () => {
		const normalized = normalizeCompanionResponse({
			summary: 'You are doing well overall.',
			overallStatus: 'stable',
			keyFindings: ['LDL improved'],
			recommendations: ['Discuss Vitamin D with your doctor'],
			followUpQuestions: [],
			confidence: 0.82,
			limitations: [],
			evidenceReferences: [
				{
					id: 'report-1',
					label: 'Annual Checkup',
					sourceType: 'health_report',
				},
			],
		})

		expect(normalized.directAnswer).toBe('You are doing well overall.')
		expect(normalized.evidenceFromReports).toEqual(['LDL improved'])
		expect(normalized.confidenceLevel).toBe('high')
		expect(normalized.doctorDiscussion).toContain(
			'Discuss Vitamin D with your doctor',
		)
	})
})
