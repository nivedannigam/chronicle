import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { askReasoningEngine } from '@/features/ask/services/ask-engine.factory'
import {
	clearConversationTurns,
	loadConversationTurns,
	loadRecentQuestionsFromTurns,
	saveConversationTurns,
} from '@/features/ask/services/conversation-persistence.service'
import {
	createAskSession,
	loadSessionTurns,
	migrateLegacySessions,
	upsertSessionFromTurns,
} from '@/features/ask/services/ask-session.service'
import {
	classifyAskError,
	type AskErrorKind,
} from '@/features/ask/components/AskErrorBanner'
import {
	addRecentQuestion,
	syncRecentQuestionsFromTurns,
} from '@/features/ask/services/ask-history.service'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'
import { aiService } from '@/features/ai/services/ai.service'
import type { AskConversationTurn } from '@/features/ask/types'
import type { ConnectorDocumentRecord } from '@/core/connectors'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import { buildMemorySessionKey } from '@/features/intelligence/services/member-context.service'
import { hydrateConversationMemoryFromStorage } from '@/features/personalization/services/conversation-session.service'
import type { ChroniclePersonalPreferences } from '@/features/personalization/types/personal-context.types'

export interface AskMemberContext {
	selectedMemberId: string | null
	selectedMemberName: string | null
	members: FamilyMemberWithAliases[]
}

function loadSessionState(sessionKey: string, sessionId: string) {
	hydrateConversationMemoryFromStorage(sessionKey)
	const turns =
		loadSessionTurns(sessionId).length > 0
			? loadSessionTurns(sessionId)
			: loadConversationTurns(sessionKey)

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
	documents: ChronicleDocument[] = [],
	storedMetrics: StoredHealthMetric[] = [],
) {
	const memberId = memberContext?.selectedMemberId ?? null
	const sessionKey = useMemo(
		() => buildMemorySessionKey(userId, memberId),
		[userId, memberId],
	)

	const [isLoading, setIsLoading] = useState(false)
	const [streamingAnswer, setStreamingAnswer] = useState<string | null>(null)
	const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
	const [error, setError] = useState<{
		kind: AskErrorKind
		message?: string
	} | null>(null)
	const [regeneratingTurnId, setRegeneratingTurnId] = useState<string | null>(
		null,
	)
	const [activeSessionId, setActiveSessionId] = useState<string>(() => {
		if (typeof window === 'undefined' || !userId) {
			return ''
		}

		migrateLegacySessions(userId)
		return createAskSession({
			userId,
			memberId,
			memberName: memberContext?.selectedMemberName ?? null,
		}).id
	})

	const [sessionState, setSessionState] = useState(() => ({
		sessionKey,
		sessionId: activeSessionId,
		...loadSessionState(sessionKey, activeSessionId),
	}))

	const activeRequestRef = useRef(0)
	const migratedRef = useRef(false)

	useEffect(() => {
		if (!userId || migratedRef.current) {
			return
		}

		migrateLegacySessions(userId)
		migratedRef.current = true
	}, [userId])

	if (sessionState.sessionKey !== sessionKey) {
		const nextSession = createAskSession({
			userId,
			memberId,
			memberName: memberContext?.selectedMemberName ?? null,
		})

		setActiveSessionId(nextSession.id)
		setSessionState({
			sessionKey,
			sessionId: nextSession.id,
			...loadSessionState(sessionKey, nextSession.id),
		})
		setStreamingAnswer(null)
		setPendingQuestion(null)
		setError(null)
	}

	const { turns, recentQuestions } = sessionState

	const persistTurns = useCallback(
		(nextTurns: AskConversationTurn[], sessionId = activeSessionId) => {
			saveConversationTurns(sessionKey, nextTurns)
			upsertSessionFromTurns({
				sessionId,
				turns: nextTurns,
				memberId,
				memberName: memberContext?.selectedMemberName ?? null,
			})
		},
		[activeSessionId, memberContext?.selectedMemberName, memberId, sessionKey],
	)

	const cancel = useCallback(() => {
		activeRequestRef.current += 1
		aiService.cancelActiveRequest()
		setIsLoading(false)
		setStreamingAnswer(null)
		setPendingQuestion(null)
	}, [])

	const clearConversation = useCallback(() => {
		clearConversationTurns(sessionKey)
		conversationMemory.clear(sessionKey)

		const nextSession = createAskSession({
			userId,
			memberId,
			memberName: memberContext?.selectedMemberName ?? null,
		})

		setActiveSessionId(nextSession.id)
		setSessionState({
			sessionKey,
			sessionId: nextSession.id,
			turns: [],
			recentQuestions: [],
		})
		setStreamingAnswer(null)
		setPendingQuestion(null)
		setError(null)
	}, [memberContext?.selectedMemberName, memberId, sessionKey, userId])

	const loadConversation = useCallback(
		(sessionId: string) => {
			const loadedTurns = loadSessionTurns(sessionId)
			hydrateConversationMemoryFromStorage(sessionKey)
			saveConversationTurns(sessionKey, loadedTurns)

			setActiveSessionId(sessionId)
			setSessionState({
				sessionKey,
				sessionId,
				turns: loadedTurns,
				recentQuestions: loadRecentQuestionsFromTurns(loadedTurns),
			})
			setStreamingAnswer(null)
			setPendingQuestion(null)
			setError(null)
		},
		[sessionKey],
	)

	const ask = useCallback(
		async (question: string, options?: { replaceTurnId?: string }) => {
			const requestId = activeRequestRef.current + 1
			activeRequestRef.current = requestId
			setIsLoading(true)
			setStreamingAnswer('')
			setPendingQuestion(question)
			setError(null)

			try {
				const result = await askReasoningEngine.answerQuestion({
					userId,
					question,
					memberId: memberContext?.selectedMemberId ?? null,
					memberName: memberContext?.selectedMemberName ?? null,
					familyMembers: memberContext?.members ?? [],
					uploadedReports,
					storedMetrics,
					connectorDocuments,
					documents,
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

				let nextTurns: AskConversationTurn[]

				if (options?.replaceTurnId) {
					nextTurns = turns
						.filter((turn) => turn.id !== options.replaceTurnId)
						.concat(result.turn)
				} else {
					nextTurns = [...turns, result.turn]
				}

				persistTurns(nextTurns)

				syncRecentQuestionsFromTurns(nextTurns)
				addRecentQuestion(question, result.turn)

				setSessionState({
					sessionKey,
					sessionId: activeSessionId,
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
			} catch (caught) {
				if (activeRequestRef.current !== requestId) {
					return null
				}

				const kind = classifyAskError(caught)
				const message =
					caught instanceof Error ? caught.message : 'Something went wrong.'

				setError({ kind, message })
				setStreamingAnswer(null)
				setPendingQuestion(null)

				return null
			} finally {
				if (activeRequestRef.current === requestId) {
					setIsLoading(false)
					setRegeneratingTurnId(null)
				}
			}
		},
		[
			userId,
			uploadedReports,
			storedMetrics,
			connectorDocuments,
			documents,
			memberContext,
			sessionKey,
			activeSessionId,
			personalPreferences,
			turns,
			persistTurns,
		],
	)

	const regenerateTurn = useCallback(
		async (turnId: string) => {
			const turn = turns.find((entry) => entry.id === turnId)

			if (!turn || isLoading) {
				return
			}

			setRegeneratingTurnId(turnId)
			await ask(turn.question, { replaceTurnId: turnId })
		},
		[ask, isLoading, turns],
	)

	const continueTurn = useCallback(
		async (turnId: string) => {
			const turn = turns.find((entry) => entry.id === turnId)

			if (!turn || isLoading) {
				return
			}

			await ask(`Please continue: ${turn.question}`)
		},
		[ask, isLoading, turns],
	)

	const dismissError = useCallback(() => setError(null), [])

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
		loadConversation,
		regenerateTurn,
		continueTurn,
		dismissError,
		isLoading,
		streamingAnswer,
		turns,
		currentTurn,
		pendingTurn,
		recentQuestions,
		sessionKey,
		activeSessionId,
		error,
		regeneratingTurnId,
	}
}
