import type {
	AskConversationTurn,
	AskRecentQuestion,
} from '@/features/ask/types'

const recentQuestions: AskRecentQuestion[] = [
	{
		id: 'recent-1',
		question: 'How is my liver?',
		displayTimestamp: 'Yesterday',
		turn: undefined,
	},
	{
		id: 'recent-2',
		question: 'Show my Vitamin D trend.',
		displayTimestamp: '2 days ago',
	},
	{
		id: 'recent-3',
		question: 'Summarize my latest report.',
		displayTimestamp: '3 days ago',
	},
]

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

export function getRecentQuestionById(
	id: string,
): AskRecentQuestion | undefined {
	return recentQuestions.find((item) => item.id === id)
}
