import { useCallback, useRef, useState } from 'react'
import { addRecentQuestion, getRecentQuestions } from '@/features/ask/services'
import { askReasoningEngine } from '@/features/ask/services/ask-engine.factory'
import { aiService } from '@/features/ai/services/ai.service'
import type {
	AskConversationTurn,
	AskRecentQuestion,
} from '@/features/ask/types'
import type { UploadedHealthReport } from '@/features/health/types'

export function useAskChronicle(
	userId: string,
	uploadedReports: UploadedHealthReport[] = [],
) {
	const [isLoading, setIsLoading] = useState(false)
	const [streamingAnswer, setStreamingAnswer] = useState<string | null>(null)
	const [currentTurn, setCurrentTurn] = useState<AskConversationTurn | null>(
		null,
	)
	const [recentQuestions, setRecentQuestions] =
		useState<AskRecentQuestion[]>(getRecentQuestions)
	const activeRequestRef = useRef(0)

	const cancel = useCallback(() => {
		activeRequestRef.current += 1
		aiService.cancelActiveRequest()
		setIsLoading(false)
		setStreamingAnswer(null)
	}, [])

	const ask = useCallback(
		async (question: string) => {
			const requestId = activeRequestRef.current + 1
			activeRequestRef.current = requestId
			setIsLoading(true)
			setStreamingAnswer('')

			try {
				const result = await askReasoningEngine.answerQuestion({
					userId,
					question,
					uploadedReports,
					onStream: (partialAnswer) => {
						if (activeRequestRef.current === requestId) {
							setStreamingAnswer(partialAnswer)
						}
					},
				})

				if (activeRequestRef.current !== requestId) {
					return null
				}

				setCurrentTurn(result.turn)
				setStreamingAnswer(null)
				const entry = addRecentQuestion(question, result.turn)
				setRecentQuestions(getRecentQuestions())

				return entry
			} finally {
				if (activeRequestRef.current === requestId) {
					setIsLoading(false)
				}
			}
		},
		[userId, uploadedReports],
	)

	return {
		ask,
		cancel,
		isLoading,
		streamingAnswer,
		currentTurn,
		recentQuestions,
	}
}
