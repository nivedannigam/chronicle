import { loadConversationTurns } from '@/features/ask/services/conversation-persistence.service'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'

export function hydrateConversationMemoryFromStorage(sessionKey: string): void {
	const storedTurns = loadConversationTurns(sessionKey)

	if (storedTurns.length === 0) {
		return
	}

	conversationMemory.hydrateFromTurns(
		sessionKey,
		storedTurns.map((turn) => ({
			question: turn.question,
			answer: turn.answer,
			intent: 'general_health',
			metricName: turn.relatedMetrics[0]?.name,
			reportId: turn.relatedReports[0]?.id,
			memberId: turn.memberId,
			memberName: turn.memberName,
		})),
	)
}

export function clearConversationSession(sessionKey: string): void {
	conversationMemory.clear(sessionKey)
}
