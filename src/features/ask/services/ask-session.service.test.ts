import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AskConversationTurn } from '@/features/ask/types'

const storage = new Map<string, string>()

vi.stubGlobal('window', {
	localStorage: {
		getItem: (key: string) => storage.get(key) ?? null,
		setItem: (key: string, value: string) => {
			storage.set(key, value)
		},
		removeItem: (key: string) => {
			storage.delete(key)
		},
	},
})

function turn(
	question: string,
	memberName: string | null = null,
): AskConversationTurn {
	return {
		id: crypto.randomUUID(),
		question,
		answer: `Answer to ${question}`,
		cards: [],
		relatedReports: [],
		relatedMetrics: [],
		citations: [],
		evidence: [],
		followUpQuestions: [],
		memberId: null,
		memberName,
		domains: ['health'],
		dataAvailable: false,
		confidence: 0.5,
		confidenceLevel: 'medium',
		timestamp: new Date().toISOString(),
		displayTimestamp: 'Now',
	}
}

describe('ask-session.service', () => {
	beforeEach(() => {
		storage.clear()
		vi.resetModules()
	})

	it('dedupes imported legacy sessions against existing indexed sessions', async () => {
		const {
			createAskSession,
			dedupeAskSessions,
			initializeAskSessions,
			listAskSessions,
			upsertSessionFromTurns,
		} = await import('@/features/ask/services/ask-session.service')

		const userId = 'user-1'
		const session = createAskSession({
			userId,
			memberId: null,
			memberName: 'Nivedan',
			title: 'hello',
		})

		upsertSessionFromTurns({
			sessionId: session.id,
			turns: [turn('hello', 'Nivedan')],
			memberId: null,
			memberName: 'Nivedan',
		})

		storage.set(
			'chronicle:ask:conversations',
			JSON.stringify({
				[`${userId}:default`]: [turn('hello')],
			}),
		)

		initializeAskSessions(userId)
		dedupeAskSessions(userId)

		const sessions = listAskSessions(userId).filter(
			(entry) => entry.title === 'hello',
		)

		expect(sessions).toHaveLength(1)
		expect(sessions[0]?.memberName).toBe('Nivedan')
	})

	it('reuses an existing session instead of creating duplicates on ensure', async () => {
		const {
			createAskSession,
			ensureAskSession,
			listAskSessions,
			upsertSessionFromTurns,
		} = await import('@/features/ask/services/ask-session.service')

		const userId = 'user-2'
		const session = createAskSession({
			userId,
			memberId: null,
			memberName: null,
		})

		upsertSessionFromTurns({
			sessionId: session.id,
			turns: [turn('hello')],
			memberId: null,
			memberName: 'Nivedan',
		})

		const resolved = ensureAskSession({
			userId,
			memberId: null,
			memberName: 'Nivedan',
		})

		expect(resolved.id).toBe(session.id)
		expect(listAskSessions(userId)).toHaveLength(1)
	})

	it('loads turns for a member session key from indexed storage', async () => {
		const { createAskSession, loadTurnsForSessionKey, upsertSessionFromTurns } =
			await import('@/features/ask/services/ask-session.service')

		const userId = 'user-3'
		const session = createAskSession({
			userId,
			memberId: null,
			memberName: null,
		})

		upsertSessionFromTurns({
			sessionId: session.id,
			turns: [turn('vitamin d trend')],
			memberId: null,
			memberName: null,
		})

		const loaded = loadTurnsForSessionKey(`${userId}:default`)

		expect(loaded).toHaveLength(1)
		expect(loaded[0]?.question).toBe('vitamin d trend')
	})
})
