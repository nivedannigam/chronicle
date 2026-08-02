import { describe, expect, it } from 'vitest'
import type { AskConversationTurn } from '@/features/ask/types'
import {
	buildCollapsedTurnPreview,
	isNoDataTurn,
	shouldCollapseTurnByDefault,
} from '@/features/ask/utils/conversation-thread-collapse'

function turn(input: Partial<AskConversationTurn>): AskConversationTurn {
	return {
		id: 'turn-1',
		question: 'hello',
		answer: "I don't have records for Nivedan that answer that yet.",
		cards: [],
		relatedReports: [],
		relatedMetrics: [],
		citations: [],
		evidence: [],
		followUpQuestions: [],
		memberId: null,
		memberName: 'Nivedan',
		domains: ['health'],
		dataAvailable: false,
		confidence: 0.2,
		confidenceLevel: 'low',
		timestamp: new Date().toISOString(),
		displayTimestamp: 'Now',
		...input,
	}
}

describe('conversation-thread-collapse', () => {
	it('detects standard no-data turns', () => {
		expect(isNoDataTurn(turn({}))).toBe(true)
		expect(
			isNoDataTurn(
				turn({
					dataAvailable: true,
					answer: 'Vitamin B12 is 450 pg/mL.',
				}),
			),
		).toBe(false)
	})

	it('collapses no-data turns even when they are recent', () => {
		expect(
			shouldCollapseTurnByDefault({
				turn: turn({}),
				index: 4,
				totalTurns: 5,
			}),
		).toBe(true)
	})

	it('keeps the last two non-no-data turns expanded', () => {
		const dataTurn = turn({
			dataAvailable: true,
			answer: 'Vitamin B12 is 450 pg/mL.',
		})

		expect(
			shouldCollapseTurnByDefault({
				turn: dataTurn,
				index: 2,
				totalTurns: 5,
			}),
		).toBe(true)

		expect(
			shouldCollapseTurnByDefault({
				turn: dataTurn,
				index: 3,
				totalTurns: 5,
			}),
		).toBe(false)

		expect(
			shouldCollapseTurnByDefault({
				turn: dataTurn,
				index: 4,
				totalTurns: 5,
			}),
		).toBe(false)
	})

	it('builds a short preview for collapsed rows', () => {
		expect(buildCollapsedTurnPreview(turn({}))).toBe(
			'No matching records in Chronicle',
		)
	})
})
