import type {
	AskConversationTurn,
	AskRecentQuestion,
} from '@/features/ask/types'
import { loadRecentQuestionsFromTurns } from '@/features/ask/services/conversation-persistence.service'

const recentQuestions: AskRecentQuestion[] = []

export function getRecentQuestions(): AskRecentQuestion[] {
	return [...recentQuestions]
}

export function addRecentQuestion(
	question: string,
	turn: AskConversationTurn,
): AskRecentQuestion {
	const entry: AskRecentQuestion = {
		id: turn.id,
		question,
		displayTimestamp: 'Just now',
		turn,
	}

	recentQuestions.unshift(entry)

	if (recentQuestions.length > 10) {
		recentQuestions.pop()
	}

	return entry
}

export function syncRecentQuestionsFromTurns(turns: AskConversationTurn[]) {
	recentQuestions.splice(
		0,
		recentQuestions.length,
		...loadRecentQuestionsFromTurns(turns),
	)
}

export function getRecentQuestionById(
	id: string,
): AskRecentQuestion | undefined {
	return recentQuestions.find((item) => item.id === id)
}
