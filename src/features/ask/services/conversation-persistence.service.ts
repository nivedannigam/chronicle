import type { AskConversationTurn } from '@/features/ask/types'
import {
	findLatestSessionForMember,
	loadTurnsForSessionKey,
	saveSessionTurns as saveIndexedSessionTurns,
} from '@/features/ask/services/ask-session.service'

const MAX_TURNS_PER_SESSION = 20

/** Indexed ask sessions are the source of truth for conversation history. */
export function loadConversationTurns(
	sessionKey: string,
): AskConversationTurn[] {
	return loadTurnsForSessionKey(sessionKey)
}

export function saveConversationTurns(
	sessionKey: string,
	turns: AskConversationTurn[],
): void {
	const separatorIndex = sessionKey.indexOf(':')

	if (separatorIndex <= 0) {
		return
	}

	const userId = sessionKey.slice(0, separatorIndex)
	const memberId =
		sessionKey.slice(separatorIndex + 1) === 'default'
			? null
			: sessionKey.slice(separatorIndex + 1)
	const session = findLatestSessionForMember(userId, memberId)

	if (!session) {
		return
	}

	saveIndexedSessionTurns(session.id, turns.slice(-MAX_TURNS_PER_SESSION))
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
	saveConversationTurns(sessionKey, [])
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
