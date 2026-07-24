import type { AskConversationTurn } from '@/features/ask/types'

export interface ConversationTurnMemory {
	question: string
	answer: string
	intent: string
	categoryId?: string
	metricName?: string
}

const sessionMemory = new Map<string, ConversationTurnMemory[]>()

export class ConversationMemory {
	getTurns(sessionKey: string): ConversationTurnMemory[] {
		return sessionMemory.get(sessionKey) ?? []
	}

	getPreviousTopic(
		sessionKey: string,
	): { categoryId?: string; metricName?: string } | undefined {
		const turns = this.getTurns(sessionKey)
		const latest = turns[turns.length - 1]

		if (!latest) {
			return undefined
		}

		return {
			categoryId: latest.categoryId,
			metricName: latest.metricName,
		}
	}

	addTurn(
		sessionKey: string,
		turn: AskConversationTurn,
		meta: { intent: string; categoryId?: string; metricName?: string },
	): void {
		const existing = this.getTurns(sessionKey)

		sessionMemory.set(
			sessionKey,
			[
				...existing,
				{
					question: turn.question,
					answer: turn.answer,
					intent: meta.intent,
					categoryId: meta.categoryId,
					metricName: meta.metricName,
				},
			].slice(-8),
		)
	}

	clear(sessionKey?: string): void {
		if (sessionKey) {
			sessionMemory.delete(sessionKey)
			return
		}

		sessionMemory.clear()
	}
}

export const conversationMemory = new ConversationMemory()
