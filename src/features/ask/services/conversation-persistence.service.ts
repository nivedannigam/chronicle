import type { AskConversationTurn } from '@/features/ask/types'

const STORAGE_KEY = 'chronicle:ask:conversations'
const MAX_TURNS_PER_SESSION = 20

interface StoredConversations {
	[sessionKey: string]: AskConversationTurn[]
}

function readStore(): StoredConversations {
	if (typeof window === 'undefined') {
		return {}
	}

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY)

		if (!raw) {
			return {}
		}

		return JSON.parse(raw) as StoredConversations
	} catch {
		return {}
	}
}

function writeStore(store: StoredConversations): void {
	if (typeof window === 'undefined') {
		return
	}

	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
	} catch {
		// Ignore quota errors in beta.
	}
}

export function loadConversationTurns(
	sessionKey: string,
): AskConversationTurn[] {
	return readStore()[sessionKey] ?? []
}

export function saveConversationTurns(
	sessionKey: string,
	turns: AskConversationTurn[],
): void {
	const store = readStore()
	store[sessionKey] = turns.slice(-MAX_TURNS_PER_SESSION)
	writeStore(store)
}

export function appendConversationTurn(
	sessionKey: string,
	turn: AskConversationTurn,
): AskConversationTurn[] {
	const next = [...loadConversationTurns(sessionKey), turn].slice(
		-MAX_TURNS_PER_SESSION,
	)
	saveConversationTurns(sessionKey, next)
	return next
}

export function clearConversationTurns(sessionKey: string): void {
	const store = readStore()
	delete store[sessionKey]
	writeStore(store)
}

export function loadRecentQuestionsFromTurns(
	turns: AskConversationTurn[],
	limit = 10,
) {
	return [...turns]
		.reverse()
		.slice(0, limit)
		.map((turn) => ({
			id: turn.id,
			question: turn.question,
			displayTimestamp: turn.displayTimestamp,
			turn,
		}))
}
