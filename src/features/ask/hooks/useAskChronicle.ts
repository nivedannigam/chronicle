import { useCallback, useMemo, useRef, useState } from 'react'
import { askReasoningEngine } from '@/features/ask/services/ask-engine.factory'
import {
	appendConversationTurn,
	clearConversationTurns,
	loadConversationTurns,
	loadRecentQuestionsFromTurns,
} from '@/features/ask/services/conversation-persistence.service'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'
import { aiService } from '@/features/ai/services/ai.service'
import type { AskConversationTurn } from '@/features/ask/types'
import type { ConnectorDocumentRecord } from '@/core/connectors'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { UploadedHealthReport } from '@/features/health/types'
import { buildMemorySessionKey } from '@/features/intelligence/services/member-context.service'
import { hydrateConversationMemoryFromStorage } from '@/features/personalization/services/conversation-session.service'
import type { ChroniclePersonalPreferences } from '@/features/personalization/types/personal-context.types'

export interface AskMemberContext {
	selectedMemberId: string | null
	selectedMemberName: string | null
	members: FamilyMemberWithAliases[]
}

function loadSessionState(sessionKey: string) {
	hydrateConversationMemoryFromStorage(sessionKey)
	const turns = loadConversationTurns(sessionKey)

	return {
		turns,
		recentQuestions: loadRecentQuestionsFromTurns(turns),
	}
}

export function useAskChronicle(
	userId: string,
	uploadedReports: UploadedHealthReport[] = [],
	memberContext?: AskMemberContext,
	connectorDocuments: ConnectorDocumentRecord[] = [],
	personalPreferences?: ChroniclePersonalPreferences,
) {
	const memberId = memberContext?.selectedMemberId ?? null
	const sessionKey = useMemo(
		() => buildMemorySessionKey(userId, memberId),
		[userId, memberId],
	)

	const [isLoading, setIsLoading] = useState(false)
	const [streamingAnswer, setStreamingAnswer] = useState<string | null>(null)
	const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
	const [sessionState, setSessionState] = useState(() => ({
		sessionKey,
		...loadSessionState(sessionKey),
	}))
	const activeRequestRef = useRef(0)

	if (sessionState.sessionKey !== sessionKey) {
		setSessionState({
			sessionKey,
			...loadSessionState(sessionKey),
		})
		setStreamingAnswer(null)
		setPendingQuestion(null)
	}

	const { turns, recentQuestions } = sessionState

	const cancel = useCallback(() => {
		activeRequestRef.current += 1
		aiService.cancelActiveRequest()
		setIsLoading(false)
		setStreamingAnswer(null)
	}, [])

	const clearConversation = useCallback(() => {
		clearConversationTurns(sessionKey)
		conversationMemory.clear(sessionKey)
		setSessionState({
			sessionKey,
			turns: [],
			recentQuestions: [],
		})
		setStreamingAnswer(null)
		setPendingQuestion(null)
	}, [sessionKey])

	const ask = useCallback(
		async (question: string) => {
			const requestId = activeRequestRef.current + 1
			activeRequestRef.current = requestId
			setIsLoading(true)
			setStreamingAnswer('')
			setPendingQuestion(question)

			try {
				const result = await askReasoningEngine.answerQuestion({
					userId,
					question,
					memberId: memberContext?.selectedMemberId ?? null,
					memberName: memberContext?.selectedMemberName ?? null,
					familyMembers: memberContext?.members ?? [],
					uploadedReports,
					connectorDocuments,
					personalPreferences,
					onStream: (partialAnswer) => {
						if (activeRequestRef.current === requestId) {
							setStreamingAnswer(partialAnswer)
						}
					},
				})

				if (activeRequestRef.current !== requestId) {
					return null
				}

				const nextTurns = appendConversationTurn(sessionKey, result.turn)

				setSessionState({
					sessionKey,
					turns: nextTurns,
					recentQuestions: loadRecentQuestionsFromTurns(nextTurns),
				})
				setStreamingAnswer(null)
				setPendingQuestion(null)

				return {
					id: result.turn.id,
					question,
					displayTimestamp: result.turn.displayTimestamp,
					turn: result.turn,
				}
			} finally {
				if (activeRequestRef.current === requestId) {
					setIsLoading(false)
				}
			}
		},
		[
			userId,
			uploadedReports,
			connectorDocuments,
			memberContext,
			sessionKey,
			personalPreferences,
		],
	)

	const currentTurn = turns[turns.length - 1] ?? null
	const pendingTurn: AskConversationTurn | null = pendingQuestion
		? {
				id: 'pending-turn',
				question: pendingQuestion,
				answer: streamingAnswer ?? '',
				cards: [],
				relatedReports: [],
				relatedMetrics: [],
				citations: [],
				evidence: [],
				followUpQuestions: [],
				memberId: memberContext?.selectedMemberId ?? null,
				memberName: memberContext?.selectedMemberName ?? null,
				domains: ['health'],
				dataAvailable: true,
				confidence: 0.5,
				confidenceLevel: 'medium',
				timestamp: new Date().toISOString(),
				displayTimestamp: 'Now',
			}
		: null

	return {
		ask,
		cancel,
		clearConversation,
		isLoading,
		streamingAnswer,
		turns,
		currentTurn,
		pendingTurn,
		recentQuestions,
		sessionKey,
	}
}
