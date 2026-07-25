import { describe, expect, it } from 'vitest'
import { buildExplainabilityTurn } from '@/features/ask/trust/explainability-response.builder'
import type { AskConversationTurn } from '@/features/ask/types'
import type { TrustResponse } from '@/features/ask/trust/trust.types'

function priorTurnWithTrust(
	trust: Partial<TrustResponse>,
): AskConversationTurn {
	return {
		id: 'prior',
		question: 'What is my LDL?',
		answer: 'Your LDL is 120 mg/dL.',
		cards: [],
		relatedReports: [{ id: 'r1', title: 'Lipid Panel', date: '2026-01-01' }],
		relatedMetrics: [{ name: 'LDL', value: '120', status: 'normal' }],
		citations: [],
		evidence: ['LDL: 120 from Lipid Panel'],
		followUpQuestions: [],
		memberId: null,
		memberName: 'Alex',
		domains: ['health'],
		dataAvailable: true,
		confidence: 0.8,
		confidenceLevel: 'high',
		timestamp: '2026-01-01T00:00:00.000Z',
		displayTimestamp: 'Jan 1',
		trust: {
			directAnswer: 'Your LDL is 120 mg/dL.',
			evidence: ['LDL: 120 from Lipid Panel'],
			supportingReports: [
				{ id: 'r1', title: 'Lipid Panel', date: '2026-01-01' },
			],
			timelineSummary: [],
			confidence: {
				level: 'high',
				score: 0.8,
				factors: ['1 supporting report', '1 structured metric'],
			},
			missingInformation: [
				'Only one report is available — trends may be limited.',
			],
			disagreements: [],
			followUpQuestions: [],
			evidenceItems: [],
			explainabilityPrompts: [
				'Why did you say this?',
				'What evidence supports this?',
				'Which reports contributed?',
				'What information is missing?',
			],
			...trust,
		},
	}
}

describe('explainability responses', () => {
	it('explains evidence from the previous turn', () => {
		const turn = buildExplainabilityTurn({
			question: 'What evidence supports this?',
			previousTurn: priorTurnWithTrust({}),
			memberId: null,
			memberName: 'Alex',
		})

		expect(turn?.answer).toContain('Evidence supporting the previous answer')
		expect(turn?.answer).toContain('LDL: 120 from Lipid Panel')
	})

	it('lists missing information when asked', () => {
		const turn = buildExplainabilityTurn({
			question: 'What information is missing?',
			previousTurn: priorTurnWithTrust({}),
			memberId: null,
			memberName: 'Alex',
		})

		expect(turn?.answer).toContain('Only one report is available')
	})

	it('returns null when there is no prior turn', () => {
		const turn = buildExplainabilityTurn({
			question: 'Why did you say this?',
			previousTurn: null,
			memberId: null,
			memberName: null,
		})

		expect(turn).toBeNull()
	})
})
