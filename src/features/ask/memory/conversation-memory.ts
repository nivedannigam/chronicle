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
	getTurns(userId: string): ConversationTurnMemory[] {
		return sessionMemory.get(userId) ?? []
	}

	getPreviousTopic(
		userId: string,
	): { categoryId?: string; metricName?: string } | undefined {
		const turns = this.getTurns(userId)
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
		userId: string,
		turn: AskConversationTurn,
		meta: { intent: string; categoryId?: string; metricName?: string },
	): void {
		const existing = this.getTurns(userId)

		sessionMemory.set(
			userId,
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

	clear(userId?: string): void {
		if (userId) {
			sessionMemory.delete(userId)
			return
		}

		sessionMemory.clear()
	}
}

export const conversationMemory = new ConversationMemory()
