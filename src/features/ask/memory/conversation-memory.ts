import type { AskConversationTurn } from '@/features/ask/types'
import { buildConversationMemoryContext } from '@/shared/ai/context/companion-context.builder'
import type { ConversationMemoryContext } from '@/shared/ai/types/companion-response.types'

export interface ConversationTurnMemory {
	question: string
	answer: string
	intent: string
	categoryId?: string
	metricName?: string
	reportId?: string
	timeRangeYears?: number
	memberId?: string | null
	memberName?: string | null
}

const sessionMemory = new Map<string, ConversationTurnMemory[]>()

export class ConversationMemory {
	getTurns(sessionKey: string): ConversationTurnMemory[] {
		return sessionMemory.get(sessionKey) ?? []
	}

	getPreviousTopic(sessionKey: string):
		| {
				categoryId?: string
				metricName?: string
				reportId?: string
				timeRangeYears?: number
				memberId?: string | null
				memberName?: string | null
				intent?: string
				lastQuestion?: string
		  }
		| undefined {
		const turns = this.getTurns(sessionKey)
		const latest = turns[turns.length - 1]

		if (!latest) {
			return undefined
		}

		return {
			categoryId: latest.categoryId,
			metricName: latest.metricName,
			reportId: latest.reportId,
			timeRangeYears: latest.timeRangeYears,
			memberId: latest.memberId,
			memberName: latest.memberName,
			intent: latest.intent,
			lastQuestion: latest.question,
		}
	}

	addTurn(
		sessionKey: string,
		turn: AskConversationTurn,
		meta: {
			intent: string
			categoryId?: string
			metricName?: string
			reportId?: string
			timeRangeYears?: number
		},
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
					reportId: meta.reportId,
					timeRangeYears: meta.timeRangeYears,
					memberId: turn.memberId,
					memberName: turn.memberName,
				},
			].slice(-8),
		)
	}

	hydrateFromTurns(sessionKey: string, turns: ConversationTurnMemory[]): void {
		if (turns.length === 0) {
			return
		}

		sessionMemory.set(sessionKey, turns.slice(-8))
	}

	clear(sessionKey?: string): void {
		if (sessionKey) {
			sessionMemory.delete(sessionKey)
			return
		}

		sessionMemory.clear()
	}

	getMemoryContext(sessionKey: string): ConversationMemoryContext {
		return buildConversationMemoryContext(this.getTurns(sessionKey))
	}
}

export const conversationMemory = new ConversationMemory()
