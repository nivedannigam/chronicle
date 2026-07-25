import type { AskConversationTurn } from '@/features/ask/types'

const SESSION_INDEX_KEY = 'chronicle:ask:session-index'
const SESSION_DATA_PREFIX = 'chronicle:ask:session:'
const LEGACY_STORAGE_KEY = 'chronicle:ask:conversations'

export interface AskSessionMeta {
	id: string
	title: string
	memberId: string | null
	memberName: string | null
	createdAt: string
	updatedAt: string
	turnCount: number
	preview: string
}

function readIndex(): AskSessionMeta[] {
	if (typeof window === 'undefined') {
		return []
	}

	try {
		const raw = window.localStorage.getItem(SESSION_INDEX_KEY)
		return raw ? (JSON.parse(raw) as AskSessionMeta[]) : []
	} catch {
		return []
	}
}

function writeIndex(sessions: AskSessionMeta[]): void {
	if (typeof window === 'undefined') {
		return
	}

	try {
		window.localStorage.setItem(SESSION_INDEX_KEY, JSON.stringify(sessions))
	} catch {
		// Ignore quota errors.
	}
}

function sessionDataKey(sessionId: string): string {
	return `${SESSION_DATA_PREFIX}${sessionId}`
}

function deriveTitle(question: string): string {
	const cleaned = question.trim().replace(/\s+/g, ' ')
	return cleaned.length > 48 ? `${cleaned.slice(0, 48)}…` : cleaned
}

export function loadSessionTurns(sessionId: string): AskConversationTurn[] {
	if (typeof window === 'undefined') {
		return []
	}

	try {
		const raw = window.localStorage.getItem(sessionDataKey(sessionId))
		return raw ? (JSON.parse(raw) as AskConversationTurn[]) : []
	} catch {
		return []
	}
}

export function saveSessionTurns(
	sessionId: string,
	turns: AskConversationTurn[],
): void {
	if (typeof window === 'undefined') {
		return
	}

	try {
		window.localStorage.setItem(
			sessionDataKey(sessionId),
			JSON.stringify(turns.slice(-50)),
		)
	} catch {
		// Ignore quota errors.
	}
}

export function listAskSessions(userId: string): AskSessionMeta[] {
	return readIndex()
		.filter((session) => session.id.startsWith(`${userId}:`))
		.sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		)
}

export function searchAskSessions(
	userId: string,
	query: string,
): AskSessionMeta[] {
	const normalized = query.trim().toLowerCase()

	if (!normalized) {
		return listAskSessions(userId)
	}

	return listAskSessions(userId).filter(
		(session) =>
			session.title.toLowerCase().includes(normalized) ||
			session.preview.toLowerCase().includes(normalized),
	)
}

export function createAskSession(input: {
	userId: string
	memberId: string | null
	memberName: string | null
	title?: string
}): AskSessionMeta {
	const now = new Date().toISOString()
	const session: AskSessionMeta = {
		id: `${input.userId}:${crypto.randomUUID()}`,
		title: input.title ?? 'New conversation',
		memberId: input.memberId,
		memberName: input.memberName,
		createdAt: now,
		updatedAt: now,
		turnCount: 0,
		preview: '',
	}

	const index = readIndex()
	index.unshift(session)
	writeIndex(index.slice(0, 40))
	saveSessionTurns(session.id, [])

	return session
}

export function upsertSessionFromTurns(input: {
	sessionId: string
	turns: AskConversationTurn[]
	memberId: string | null
	memberName: string | null
}): void {
	saveSessionTurns(input.sessionId, input.turns)

	const index = readIndex()
	const existing = index.find((session) => session.id === input.sessionId)
	const firstQuestion = input.turns[0]?.question ?? ''
	const lastAnswer = input.turns[input.turns.length - 1]?.answer ?? ''
	const now = new Date().toISOString()

	const updated: AskSessionMeta = existing
		? {
				...existing,
				updatedAt: now,
				turnCount: input.turns.length,
				preview: lastAnswer.slice(0, 120),
				title:
					existing.title === 'New conversation' && firstQuestion
						? deriveTitle(firstQuestion)
						: existing.title,
			}
		: {
				id: input.sessionId,
				title: firstQuestion ? deriveTitle(firstQuestion) : 'New conversation',
				memberId: input.memberId,
				memberName: input.memberName,
				createdAt: now,
				updatedAt: now,
				turnCount: input.turns.length,
				preview: lastAnswer.slice(0, 120),
			}

	const nextIndex = [
		updated,
		...index.filter((session) => session.id !== input.sessionId),
	].slice(0, 40)

	writeIndex(nextIndex)
}

export function renameAskSession(sessionId: string, title: string): void {
	const index = readIndex()
	const session = index.find((entry) => entry.id === sessionId)

	if (!session) {
		return
	}

	session.title = title.trim() || session.title
	session.updatedAt = new Date().toISOString()
	writeIndex(index)
}

export function deleteAskSession(sessionId: string): void {
	writeIndex(readIndex().filter((session) => session.id !== sessionId))

	if (typeof window !== 'undefined') {
		try {
			window.localStorage.removeItem(sessionDataKey(sessionId))
		} catch {
			// Ignore.
		}
	}
}

/** Migrate legacy per-member session keys into indexed sessions once. */
export function migrateLegacySessions(userId: string): void {
	if (typeof window === 'undefined') {
		return
	}

	try {
		const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)

		if (!raw) {
			return
		}

		const store = JSON.parse(raw) as Record<string, AskConversationTurn[]>

		for (const [sessionKey, turns] of Object.entries(store)) {
			if (!sessionKey.startsWith(userId) || turns.length === 0) {
				continue
			}

			const session = createAskSession({
				userId,
				memberId: null,
				memberName: null,
				title: turns[0]?.question
					? deriveTitle(turns[0].question)
					: 'Imported chat',
			})

			upsertSessionFromTurns({
				sessionId: session.id,
				turns,
				memberId: turns[0]?.memberId ?? null,
				memberName: turns[0]?.memberName ?? null,
			})
		}

		window.localStorage.removeItem(LEGACY_STORAGE_KEY)
	} catch {
		// Ignore migration failures.
	}
}
