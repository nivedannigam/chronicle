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

	it('sorts pinned sessions ahead of unpinned sessions', async () => {
		const {
			createAskSession,
			listAskSessions,
			pinAskSession,
			upsertSessionFromTurns,
		} = await import('@/features/ask/services/ask-session.service')

		const userId = 'user-pin'
		const older = createAskSession({
			userId,
			memberId: null,
			memberName: null,
			title: 'older',
		})
		const newer = createAskSession({
			userId,
			memberId: null,
			memberName: null,
			title: 'newer',
		})

		upsertSessionFromTurns({
			sessionId: older.id,
			turns: [turn('older question')],
			memberId: null,
			memberName: null,
		})
		upsertSessionFromTurns({
			sessionId: newer.id,
			turns: [turn('newer question')],
			memberId: null,
			memberName: null,
		})

		pinAskSession(older.id)

		expect(listAskSessions(userId)[0]?.id).toBe(older.id)
	})

	it('archives sessions and hides them from the default list', async () => {
		const {
			archiveAskSession,
			createAskSession,
			listArchivedAskSessions,
			listAskSessions,
			upsertSessionFromTurns,
		} = await import('@/features/ask/services/ask-session.service')

		const userId = 'user-archive'
		const session = createAskSession({
			userId,
			memberId: null,
			memberName: null,
			title: 'archive me',
		})

		upsertSessionFromTurns({
			sessionId: session.id,
			turns: [turn('archive me')],
			memberId: null,
			memberName: null,
		})

		archiveAskSession(session.id)

		expect(listAskSessions(userId)).toHaveLength(0)
		expect(listArchivedAskSessions(userId)).toHaveLength(1)
	})

	it('clears all sessions for a user', async () => {
		const {
			clearAllAskSessions,
			createAskSession,
			listAskSessions,
			upsertSessionFromTurns,
		} = await import('@/features/ask/services/ask-session.service')

		const userId = 'user-clear'
		const session = createAskSession({
			userId,
			memberId: null,
			memberName: null,
		})

		upsertSessionFromTurns({
			sessionId: session.id,
			turns: [turn('clear me')],
			memberId: null,
			memberName: null,
		})

		clearAllAskSessions(userId)

		expect(listAskSessions(userId)).toHaveLength(0)
	})

	it('groups drawer sessions into pinned, recent, and older buckets', async () => {
		const {
			createAskSession,
			groupAskSessionsForDrawer,
			pinAskSession,
			upsertSessionFromTurns,
		} = await import('@/features/ask/services/ask-session.service')

		const userId = 'user-groups'
		const pinned = createAskSession({
			userId,
			memberId: null,
			memberName: null,
			title: 'pinned',
		})
		const recent = createAskSession({
			userId,
			memberId: null,
			memberName: null,
			title: 'recent',
		})
		const older = createAskSession({
			userId,
			memberId: null,
			memberName: null,
			title: 'older',
		})

		for (const [session, question] of [
			[pinned, 'pinned question'],
			[recent, 'recent question'],
			[older, 'older question'],
		] as const) {
			upsertSessionFromTurns({
				sessionId: session.id,
				turns: [turn(question)],
				memberId: null,
				memberName: null,
			})
		}

		pinAskSession(pinned.id)

		const index = JSON.parse(
			storage.get('chronicle:ask:session-index') ?? '[]',
		) as Array<{ id: string; updatedAt: string }>
		const olderEntry = index.find((entry) => entry.id === older.id)

		if (olderEntry) {
			olderEntry.updatedAt = new Date('2020-01-01T00:00:00.000Z').toISOString()
			storage.set('chronicle:ask:session-index', JSON.stringify(index))
		}

		const groups = groupAskSessionsForDrawer(userId)

		expect(groups.pinned.map((session) => session.id)).toEqual([pinned.id])
		expect(groups.recent.some((session) => session.id === recent.id)).toBe(true)
		expect(groups.older.some((session) => session.id === older.id)).toBe(true)
	})
})
