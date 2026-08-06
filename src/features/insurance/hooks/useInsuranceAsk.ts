import { useCallback, useMemo, useRef, useState } from 'react'
import {
	classifyAskError,
	formatAskErrorMessage,
	type AskErrorKind,
} from '@/features/ask/components/AskErrorBanner'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'
import type { AskConversationTurn } from '@/features/ask/types'
import { buildInsuranceAskTurn } from '@/features/insurance/services/insurance-ask.engine'
import {
	createInsuranceAskSession,
	deleteInsuranceAskSession,
	ensureInsuranceAskSession,
	loadInsuranceSessionTurns,
	resolveActiveInsuranceAskSession,
	upsertInsuranceSessionFromTurns,
} from '@/features/insurance/services/insurance-ask-session.service'
import type { InsuranceAskScope } from '@/features/insurance/types/insurance-ask.types'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import { buildMemorySessionKey } from '@/features/intelligence/services/member-context.service'

export interface InsuranceAskMemberContext {
	selectedMemberId: string | null
	selectedMemberName: string | null
}

function buildInsuranceSessionKey(
	userId: string,
	memberId: string | null,
): string {
	return `insurance:${buildMemorySessionKey(userId, memberId)}`
}

function hydrateInsuranceMemoryFromTurns(
	sessionKey: string,
	turns: AskConversationTurn[],
): void {
	if (turns.length === 0) {
		return
	}

	conversationMemory.hydrateFromTurns(
		sessionKey,
		turns.map((turn) => ({
			question: turn.question,
			answer: turn.answer,
			intent: 'general',
			memberId: turn.memberId,
			memberName: turn.memberName,
		})),
	)
}

function loadSessionState(sessionKey: string, sessionId: string) {
	hydrateInsuranceMemoryFromTurns(sessionKey, [])

	if (!sessionId) {
		return { turns: [] as AskConversationTurn[] }
	}

	const turns = loadInsuranceSessionTurns(sessionId)
	hydrateInsuranceMemoryFromTurns(sessionKey, turns)

	return { turns }
}

function resolveInitialSessionId(
	userId: string,
	memberId: string | null,
): string {
	if (typeof window === 'undefined' || !userId) {
		return ''
	}

	return resolveActiveInsuranceAskSession({ userId, memberId })?.id ?? ''
}

async function streamAnswer(
	answer: string,
	onChunk: (partial: string) => void,
	isCancelled: () => boolean,
): Promise<void> {
	const chunkSize = 18

	for (let index = chunkSize; index < answer.length; index += chunkSize) {
		if (isCancelled()) {
			return
		}

		onChunk(answer.slice(0, index))
		await new Promise((resolve) => window.setTimeout(resolve, 12))
	}

	if (!isCancelled()) {
		onChunk(answer)
	}
}

export function useInsuranceAsk(
	userId: string,
	knowledge: InsuranceKnowledge,
	memberContext?: InsuranceAskMemberContext,
	scope?: InsuranceAskScope,
) {
	const memberId = memberContext?.selectedMemberId ?? null
	const sessionKey = useMemo(
		() => buildInsuranceSessionKey(userId, memberId),
		[userId, memberId],
	)

	const [isLoading, setIsLoading] = useState(false)
	const [streamingAnswer, setStreamingAnswer] = useState<string | null>(null)
	const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
	const [error, setError] = useState<{
		kind: AskErrorKind
		message?: string
	} | null>(null)
	const [activeSessionId, setActiveSessionId] = useState<string>(() =>
		resolveInitialSessionId(userId, memberId),
	)

	const [sessionState, setSessionState] = useState(() => ({
		sessionKey,
		sessionId: activeSessionId,
		...loadSessionState(sessionKey, activeSessionId),
	}))

	const activeRequestRef = useRef(0)

	if (sessionState.sessionKey !== sessionKey) {
		const nextSessionId =
			resolveActiveInsuranceAskSession({ userId, memberId })?.id ?? ''

		setActiveSessionId(nextSessionId)
		setSessionState({
			sessionKey,
			sessionId: nextSessionId,
			...loadSessionState(sessionKey, nextSessionId),
		})
		setStreamingAnswer(null)
		setPendingQuestion(null)
		setError(null)
	}

	const { turns } = sessionState

	const persistTurns = useCallback(
		(
			nextTurns: AskConversationTurn[],
			sessionId = activeSessionId,
			memberName = memberContext?.selectedMemberName ?? null,
		) => {
			if (!sessionId) {
				return
			}

			upsertInsuranceSessionFromTurns({
				sessionId,
				turns: nextTurns,
				memberId,
				memberName,
			})
		},
		[activeSessionId, memberContext?.selectedMemberName, memberId],
	)

	const cancel = useCallback(() => {
		activeRequestRef.current += 1
		setIsLoading(false)
		setStreamingAnswer(null)
		setPendingQuestion(null)
	}, [])

	const clearConversation = useCallback(() => {
		if (activeSessionId) {
			deleteInsuranceAskSession(activeSessionId)
		}

		conversationMemory.clear(sessionKey)

		const nextSession = createInsuranceAskSession({
			userId,
			memberId,
			memberName: memberContext?.selectedMemberName ?? null,
		})

		setActiveSessionId(nextSession.id)
		setSessionState({
			sessionKey,
			sessionId: nextSession.id,
			turns: [],
		})
		setStreamingAnswer(null)
		setPendingQuestion(null)
		setError(null)
	}, [
		activeSessionId,
		memberContext?.selectedMemberName,
		memberId,
		sessionKey,
		userId,
	])

	const loadConversation = useCallback(
		(sessionId: string) => {
			const loadedTurns = loadInsuranceSessionTurns(sessionId)
			hydrateInsuranceMemoryFromTurns(sessionKey, loadedTurns)

			setActiveSessionId(sessionId)
			setSessionState({
				sessionKey,
				sessionId,
				turns: loadedTurns,
			})
			setStreamingAnswer(null)
			setPendingQuestion(null)
			setError(null)
		},
		[sessionKey],
	)

	const ask = useCallback(
		async (question: string) => {
			const requestId = activeRequestRef.current + 1
			activeRequestRef.current = requestId
			setIsLoading(true)
			setStreamingAnswer('')
			setPendingQuestion(question)
			setError(null)

			const resolved = ensureInsuranceAskSession({
				userId,
				memberId,
				memberName: memberContext?.selectedMemberName ?? null,
			})
			const sessionId = resolved.id

			if (sessionId !== activeSessionId) {
				setActiveSessionId(sessionId)
			}

			const currentTurns =
				sessionId === sessionState.sessionId
					? turns
					: loadInsuranceSessionTurns(sessionId)

			try {
				const turn = buildInsuranceAskTurn({
					knowledge,
					question,
					memberId,
					memberName: memberContext?.selectedMemberName ?? null,
					sessionKey,
					scope,
				})

				await streamAnswer(
					turn.answer,
					(partial) => {
						if (activeRequestRef.current === requestId) {
							setStreamingAnswer(partial)
						}
					},
					() => activeRequestRef.current !== requestId,
				)

				if (activeRequestRef.current !== requestId) {
					return null
				}

				const nextTurns = [...currentTurns, turn]

				persistTurns(
					nextTurns,
					sessionId,
					memberContext?.selectedMemberName ?? null,
				)

				setSessionState({
					sessionKey,
					sessionId,
					turns: nextTurns,
				})
				setStreamingAnswer(null)
				setPendingQuestion(null)

				return {
					id: turn.id,
					question,
					displayTimestamp: turn.displayTimestamp,
					turn,
				}
			} catch (caught) {
				if (activeRequestRef.current !== requestId) {
					return null
				}

				const kind = classifyAskError(caught)
				const message =
					formatAskErrorMessage(caught) ??
					(caught instanceof Error ? caught.message : 'Something went wrong.')

				setError({ kind, message })
				setStreamingAnswer(null)
				setPendingQuestion(null)

				return null
			} finally {
				if (activeRequestRef.current === requestId) {
					setIsLoading(false)
				}
			}
		},
		[
			userId,
			knowledge,
			memberContext,
			sessionKey,
			activeSessionId,
			sessionState.sessionId,
			turns,
			persistTurns,
			memberId,
			scope,
		],
	)

	const dismissError = useCallback(() => setError(null), [])

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
				domains: ['insurance'],
				dataAvailable: knowledge.policies.length > 0,
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
		dismissError,
		isLoading,
		streamingAnswer,
		turns,
		pendingTurn,
		sessionKey,
		activeSessionId,
		error,
	}
}
