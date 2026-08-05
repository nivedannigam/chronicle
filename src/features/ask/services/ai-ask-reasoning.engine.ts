import { buildAskHealthContext } from '@/features/ask/context/ask-health-context.builder'
import { resolveAnswerStrategy } from '@/features/ask/routing/answer-strategy.router'
import { attachTrustToTurn } from '@/features/ask/services/grounded-response.builder'
import {
	buildFactLookupTurn,
	buildNoRecordsTurn,
} from '@/features/ask/services/fact-lookup.service'
import {
	buildNarrativeFailureTurn,
	platformResponseToAskTurn,
} from '@/features/ask/services/platform-response.adapter'
import { runProductionHealthAi } from '@/features/ask/services/summarize-latest-report.service'
import { buildExplainabilityTurn } from '@/features/ask/trust/explainability-response.builder'
import type { AskReasoningEngine } from '@/features/ask/services/knowledge-query.interface'
import { loadConversationTurns } from '@/features/ask/services/conversation-persistence.service'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'
import type {
	AskDebugInfo,
	AskQuestionResult,
	AskRoutingLabel,
} from '@/features/ask/types'
import { buildHealthCoverageSnapshot } from '@/features/health/services/health-coverage.service'
import { runIntelligencePipeline } from '@/features/intelligence/pipeline/chronicle-intelligence.pipeline'
import { buildIntelligenceSources } from '@/features/intelligence/types/intelligence.types'
import {
	buildMemorySessionKey,
	resolveMemberFromQuestion,
} from '@/features/intelligence/services/member-context.service'
import {
	buildConversationContext,
	buildPersonalContext,
} from '@/features/personalization/services/personal-context.engine'
import {
	DEFAULT_PERSONAL_PREFERENCES,
	type ChroniclePersonalPreferences,
} from '@/features/personalization/types/personal-context.types'
import { recordUsageSignal } from '@/features/personalization/services/usage-tracker.service'
import { isAIPlatformConfigured } from '@/shared/ai/config/ai-platform.config'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'
import { recordBetaExperienceUsage } from '@/features/ask/beta/beta-observability.service'
import { resolveBetaExperience } from '@/features/ask/beta/beta-experience-resolver'

let lastDebugInfo: AskDebugInfo | null = null

export function getLastAskDebugInfo(): AskDebugInfo | null {
	return lastDebugInfo
}

const STREAM_REVIEW_MESSAGE = 'Chronicle is reviewing your health records…'

export class AiAskReasoningEngine implements AskReasoningEngine {
	async answerQuestion(input: {
		userId: string
		question: string
		memberId?: string | null
		memberName?: string | null
		familyMembers?: import('@/features/family/types/family.types').FamilyMemberWithAliases[]
		onStream?: (partialAnswer: string) => void
		uploadedReports?: unknown[]
		storedMetrics?: unknown[]
		connectorDocuments?: import('@/core/connectors').ConnectorDocumentRecord[]
		documents?: import('@/features/documents/types/document.types').ChronicleDocument[]
		personalPreferences?: ChroniclePersonalPreferences
		scope?: import('@/features/ask/services/knowledge-query.interface').AskScopeContext
	}): Promise<AskQuestionResult> {
		const startedAt = performance.now()
		const preferences =
			input.personalPreferences ?? DEFAULT_PERSONAL_PREFERENCES
		const bootstrapSessionKey = buildMemorySessionKey(
			input.userId,
			input.memberId ?? null,
		)
		const bootstrapConversation = buildConversationContext(bootstrapSessionKey)

		const member = resolveMemberFromQuestion({
			question: input.question,
			selectedMemberId: input.memberId ?? null,
			selectedMemberName: input.memberName ?? null,
			members: input.familyMembers ?? [],
			conversationContext: bootstrapConversation,
		})

		const sessionKey = buildMemorySessionKey(input.userId, member.memberId)
		const personalContext = buildPersonalContext({
			userId: input.userId,
			question: input.question,
			selectedMemberId: input.memberId ?? null,
			selectedMemberName: input.memberName ?? null,
			members: input.familyMembers ?? [],
			preferences,
			sessionKey,
		})

		const pipeline = runIntelligencePipeline({
			userId: input.userId,
			question: input.question,
			member: personalContext.activeMember,
			sources: buildIntelligenceSources({
				uploadedReports: input.uploadedReports,
				storedMetrics: input.storedMetrics,
				connectorDocuments: input.connectorDocuments,
				documents: input.documents,
			}),
		})

		const knowledge = pipeline.mergedKnowledge
		const memberForTurn = {
			...personalContext.activeMember,
			memberName:
				input.memberName ?? personalContext.activeMember.memberName ?? null,
		}

		const coverage = buildHealthCoverageSnapshot({
			uploadedReports: (input.uploadedReports ?? []) as UploadedHealthReport[],
			importRegistry: input.connectorDocuments ?? [],
			storedMetrics: (input.storedMetrics ?? []) as StoredHealthMetric[],
			memberId: memberForTurn.memberId,
		})

		const strategyResult = resolveAnswerStrategy({
			question: input.question,
			legacyIntent: pipeline.detection.intent,
		})

		let turn: import('@/features/ask/types').AskConversationTurn
		let usedProvider = 'structured'
		let routing: AskRoutingLabel = 'grounded'

		// ── META: explain prior turn ─────────────────────────────────────
		if (strategyResult.strategy === 'META') {
			const priorTurns = loadConversationTurns(sessionKey)
			const explainTurn = buildExplainabilityTurn({
				question: input.question,
				previousTurn: priorTurns[priorTurns.length - 1] ?? null,
				memberId: memberForTurn.memberId,
				memberName: memberForTurn.memberName,
			})

			if (explainTurn) {
				if (input.onStream) {
					input.onStream(explainTurn.answer)
				}

				conversationMemory.addTurn(sessionKey, explainTurn, {
					intent: 'explain_response',
				})

				return {
					turn: explainTurn,
					intent: 'explain_response',
					implementation: 'grounded-only',
					routing: 'explainability',
				}
			}
		}

		if (!knowledge || !pipeline.dataAvailable) {
			turn = buildNoRecordsTurn({
				question: input.question,
				memberId: memberForTurn.memberId,
				memberName: memberForTurn.memberName,
				domains: pipeline.activeDomains,
			})
		} else {
			const healthContext = buildAskHealthContext({
				knowledge,
				coverage,
				dataAvailable: pipeline.dataAvailable,
			})

			// ── FACT LOOKUP ──────────────────────────────────────────────────
			if (strategyResult.strategy === 'FACT_LOOKUP') {
				const factTurn = buildFactLookupTurn({
					question: input.question,
					knowledge,
					context: healthContext,
					memberId: memberForTurn.memberId,
					memberName: memberForTurn.memberName,
					domains: pipeline.activeDomains,
					metricName: pipeline.detection.metricName,
				})

				turn =
					factTurn ??
					buildNoRecordsTurn({
						question: input.question,
						memberId: memberForTurn.memberId,
						memberName: memberForTurn.memberName,
						domains: pipeline.activeDomains,
					})
				usedProvider = 'fact-lookup'
				routing = 'grounded'
			} else {
				// ── NARRATIVE: Gemini only ─────────────────────────────────────
				if (input.onStream) {
					input.onStream(STREAM_REVIEW_MESSAGE)
				}

				if (!isAIPlatformConfigured()) {
					turn = buildNarrativeFailureTurn({
						question: input.question,
						member: memberForTurn,
						domains: pipeline.activeDomains,
					})
					usedProvider = 'unconfigured'
				} else {
					try {
						const betaExperience = resolveBetaExperience(input.question)
						const platformResult = await runProductionHealthAi({
							userId: input.userId,
							question: input.question,
							familyMemberId: memberForTurn.memberId,
							accountOwnerMemberId: input.familyMembers?.find(
								(item) => item.isAccountOwner,
							)?.id,
							memberName: memberForTurn.memberName,
							categoryId: input.scope?.categoryId,
							reportId: input.scope?.reportId,
							reportIds: input.scope?.reportIds,
							conversationTurns: conversationMemory.getTurns(sessionKey),
							onStream: input.onStream,
							betaExperienceId: betaExperience?.id,
						})

						turn = platformResponseToAskTurn({
							response: platformResult.result.response,
							healthKnowledge: platformResult.result.healthKnowledge,
							member: memberForTurn,
							domains: pipeline.activeDomains,
							dataAvailable: pipeline.dataAvailable,
							question: input.question,
							betaExperienceId: betaExperience?.id,
						})

						turn = attachTrustToTurn(turn, {
							knowledge,
							question: input.question,
							dataAvailable: pipeline.dataAvailable,
							uploadedReports: input.uploadedReports,
							confidence: platformResult.result.response.confidence,
						})

						usedProvider =
							platformResult.result.observability.provider ?? 'gemini-platform'
						routing = 'production-ai'
					} catch (error) {
						turn = buildNarrativeFailureTurn({
							question: input.question,
							member: memberForTurn,
							domains: pipeline.activeDomains,
							error,
						})
						usedProvider = 'gemini-platform-error'
					}
				}
			}
		}

		if (input.onStream && turn.answer) {
			input.onStream(turn.answer)
		}

		conversationMemory.addTurn(sessionKey, turn, {
			intent: pipeline.detection.intent,
			categoryId: pipeline.detection.categoryId,
			metricName: pipeline.detection.metricName,
			reportId: turn.relatedReports[0]?.id,
			timeRangeYears: pipeline.detection.timeRangeYears,
		})

		recordUsageSignal({
			userId: input.userId,
			memberId: memberForTurn.memberId,
			type: 'ask_question',
			topic: pipeline.detection.metricName ?? pipeline.detection.categoryId,
			reportId: turn.relatedReports[0]?.id,
			timestamp: new Date().toISOString(),
		})

		const betaExperience = resolveBetaExperience(input.question)

		if (betaExperience) {
			recordBetaExperienceUsage({
				userId: input.userId,
				memberId: memberForTurn.memberId,
				experienceId: betaExperience.id,
				question: input.question,
				provider: usedProvider,
				latencyMs: performance.now() - startedAt,
				confidence: turn.confidence,
			})
		}

		if (import.meta.env.DEV) {
			lastDebugInfo = {
				intent: pipeline.detection.intent,
				resolvedQuestion: pipeline.resolvedQuestion,
				retrievedKnowledge: knowledge!,
				provider: usedProvider,
				providerResponse: turn.answer,
				turn,
			}
		}

		return {
			turn,
			intent: pipeline.detection.intent,
			implementation:
				routing === 'production-ai' ? 'ai-provider' : 'grounded-only',
			routing,
			debug: import.meta.env.DEV ? (lastDebugInfo ?? undefined) : undefined,
		}
	}
}

export const aiAskReasoningEngine = new AiAskReasoningEngine()
