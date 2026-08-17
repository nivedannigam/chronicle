import type { AskConversationTurn } from '@/features/ask/types'
import type { AskSessionMeta } from '@/features/ask/services/ask-session.service'
import { buildMemorySessionKey } from '@/features/intelligence/services/member-context.service'

const SESSION_INDEX_KEY = 'chronicle:vehicle-ask:session-index'
const SESSION_DATA_PREFIX = 'chronicle:vehicle-ask:session:'

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

function saveSessionTurns(
	sessionId: string,
	turns: AskConversationTurn[],
): void {
	if (typeof window === 'undefined') {
		return
	}

	try {
		window.localStorage.setItem(
			`${SESSION_DATA_PREFIX}${sessionId}`,
			JSON.stringify(turns),
		)
	} catch {
		// Ignore quota errors.
	}
}

function deriveTitle(question: string): string {
	const trimmed = question.trim()

	if (trimmed.length <= 48) {
		return trimmed
	}

	return `${trimmed.slice(0, 45)}…`
}

function parseUserIdFromSessionId(sessionId: string): string | null {
	const parts = sessionId.split(':')

	return parts.length >= 2 ? (parts[0] ?? null) : null
}

export function loadVehicleSessionTurns(
	sessionId: string,
): AskConversationTurn[] {
	if (typeof window === 'undefined' || !sessionId) {
		return []
	}

	try {
		const raw = window.localStorage.getItem(
			`${SESSION_DATA_PREFIX}${sessionId}`,
		)

		return raw ? (JSON.parse(raw) as AskConversationTurn[]) : []
	} catch {
		return []
	}
}

export function listVehicleAskSessions(userId: string): AskSessionMeta[] {
	return readIndex()
		.filter((session) => session.id.startsWith(`${userId}:`))
		.sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		)
}

export function resolveActiveVehicleAskSession(input: {
	userId: string
	memberId: string | null
}): AskSessionMeta | null {
	const sessions = listVehicleAskSessions(input.userId)

	return (
		sessions.find((session) => session.memberId === input.memberId) ??
		sessions[0] ??
		null
	)
}

export function createVehicleAskSession(input: {
	userId: string
	memberId: string | null
	memberName: string | null
}): AskSessionMeta {
	const now = new Date().toISOString()
	const session: AskSessionMeta = {
		id: `${input.userId}:${crypto.randomUUID()}`,
		title: 'New conversation',
		memberId: input.memberId,
		memberName: input.memberName,
		sessionKey: `vehicles:${buildMemorySessionKey(input.userId, input.memberId)}`,
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

export function ensureVehicleAskSession(input: {
	userId: string
	memberId: string | null
	memberName: string | null
}): AskSessionMeta {
	return (
		resolveActiveVehicleAskSession({
			userId: input.userId,
			memberId: input.memberId,
		}) ?? createVehicleAskSession(input)
	)
}

export function upsertVehicleSessionFromTurns(input: {
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
	const userId = parseUserIdFromSessionId(input.sessionId)

	const updated: AskSessionMeta = existing
		? {
				...existing,
				memberId: input.memberId ?? existing.memberId,
				memberName: input.memberName ?? existing.memberName,
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
				sessionKey: userId
					? `vehicles:${buildMemorySessionKey(userId, input.memberId)}`
					: null,
				createdAt: now,
				updatedAt: now,
				turnCount: input.turns.length,
				preview: lastAnswer.slice(0, 120),
			}

	writeIndex(
		[
			updated,
			...index.filter((session) => session.id !== input.sessionId),
		].slice(0, 40),
	)
}

export function deleteVehicleAskSession(sessionId: string): void {
	if (typeof window === 'undefined') {
		return
	}

	writeIndex(readIndex().filter((session) => session.id !== sessionId))
	window.localStorage.removeItem(`${SESSION_DATA_PREFIX}${sessionId}`)
}

export function searchVehicleAskSessions(
	userId: string,
	query: string,
): AskSessionMeta[] {
	const normalized = query.trim().toLowerCase()

	if (!normalized) {
		return listVehicleAskSessions(userId)
	}

	return listVehicleAskSessions(userId).filter((session) => {
		const turns = loadVehicleSessionTurns(session.id)

		return (
			session.title.toLowerCase().includes(normalized) ||
			session.preview.toLowerCase().includes(normalized) ||
			turns.some(
				(turn) =>
					turn.question.toLowerCase().includes(normalized) ||
					turn.answer.toLowerCase().includes(normalized),
			)
		)
	})
}
