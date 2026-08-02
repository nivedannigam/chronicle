import { askAiConfig, isAskAiProviderConfigured } from '@/config/ask-ai'
import { applyPromptPostProcessing } from '@chronicle/core-ai'
import { aiService } from '@/features/ai/services/ai.service'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'
import { promptBuilder } from '@/features/ask/prompt/prompt-builder'
import type { AskReasoningEngine } from '@/features/ask/services/knowledge-query.interface'
import {
	attachTrustToTurn,
	buildGroundedTurn,
	citationsFromAiResponse,
	extractPartialAnswerFromJsonStream,
	parseAiJsonResponse,
	verifyCitations,
} from '@/features/ask/services/grounded-response.builder'
import { loadConversationTurns } from '@/features/ask/services/conversation-persistence.service'
import { buildExplainabilityTurn } from '@/features/ask/trust/explainability-response.builder'
import type {
	AskDebugInfo,
	AskQuestionResult,
	AskRoutingLabel,
} from '@/features/ask/types'
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
import { adaptAnswerForStyle } from '@/features/personalization/services/response-adapter.service'
import { runIntelligencePipeline } from '@/features/intelligence/pipeline/chronicle-intelligence.pipeline'
import { buildIntelligenceSources } from '@/features/intelligence/types/intelligence.types'
import { createEmptyContextPackage } from '@/features/intelligence/entities/knowledge-entities'
import { toRetrievedKnowledge } from '@/features/intelligence/adapters/retrieved-knowledge.adapter'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'

import type { UploadedHealthReport } from '@/features/health/types'
import { buildHealthCoverageSnapshot } from '@/features/health/services/health-coverage.service'
import {
	formatPlatformErrorForUser,
	runProductionHealthAi,
	shouldUseProductionAi,
} from '@/features/ask/services/summarize-latest-report.service'
import {
	getProductionAiConfigurationError,
	isLlmHealthQuestion,
} from '@/shared/ai/errors/ai-errors'
import { resolveBetaExperience } from '@/features/ask/beta/beta-experience-resolver'
import { buildBetaExperienceTurn } from '@/features/ask/beta/beta-domain-handlers'
import { recordBetaExperienceUsage } from '@/features/ask/beta/beta-observability.service'
import type { AIObservabilityRecord } from '@/shared/ai/observability/ai-observability.types'

let lastDebugInfo: AskDebugInfo | null = null

export function getLastAskDebugInfo(): AskDebugInfo | null {
	return lastDebugInfo
}

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
	}): Promise<AskQuestionResult> {
		const startedAt = performance.now()
		const betaExperience = resolveBetaExperience(input.question)
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
		const fallbackDomain = pipeline.activeDomains[0] ?? 'health'
		const knowledge =
			pipeline.mergedKnowledge ??
			toRetrievedKnowledge(
				createEmptyContextPackage(),
				fallbackDomain,
				pipeline.detection.intent,
			)

		const prompt = promptBuilder.build({
			question: pipeline.resolvedQuestion,
			knowledge: pipeline.mergedKnowledge,
			contextJson: pipeline.builtContext.contextJson,
			memory: conversationMemory.getTurns(sessionKey),
			member: personalContext.activeMember,
			dataAvailable: pipeline.dataAvailable,
			personalContext,
			activeDomains: pipeline.activeDomains,
			intent: pipeline.detection.intent,
		})

		if (pipeline.detection.intent === 'explain_response') {
			const priorTurns = loadConversationTurns(sessionKey)
			const previousTurn = priorTurns[priorTurns.length - 1] ?? null
			const explainTurn = buildExplainabilityTurn({
				question: input.question,
				previousTurn,
				memberId: personalContext.activeMember.memberId,
				memberName: personalContext.activeMember.memberName,
			})

			if (explainTurn) {
				if (input.onStream) {
					input.onStream(explainTurn.answer)
				}

				conversationMemory.addTurn(sessionKey, explainTurn, {
					intent: 'explain_response',
					categoryId: pipeline.detection.categoryId,
					metricName: pipeline.detection.metricName,
				})

				if (import.meta.env.DEV) {
					lastDebugInfo = {
						intent: 'explain_response',
						resolvedQuestion: input.question,
						retrievedKnowledge: knowledge,
						prompt,
						provider: 'explainability',
						providerResponse: explainTurn.answer,
						turn: explainTurn,
					}
				}

				return {
					turn: explainTurn,
					intent: 'explain_response',
					implementation: 'grounded-only',
					routing: 'explainability',
					debug: import.meta.env.DEV ? (lastDebugInfo ?? undefined) : undefined,
				}
			}
		}

		const cacheKey = `${sessionKey}:${pipeline.detection.intent}:${pipeline.resolvedQuestion}:${knowledge.metrics.length}:${knowledge.reports.length}`
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

		const llmHealthQuestion = isLlmHealthQuestion({
			question: input.question,
			legacyIntent: pipeline.detection.intent,
		})
		const configurationError =
			llmHealthQuestion && betaExperience?.route !== 'grounded'
				? getProductionAiConfigurationError()
				: null

		if (configurationError) {
			const timestamp = new Date().toISOString()
			const configTurn = {
				id: crypto.randomUUID(),
				question: input.question,
				answer: configurationError,
				cards: [],
				relatedReports: [],
				relatedMetrics: [],
				citations: [],
				evidence: [],
				followUpQuestions: [],
				memberId: memberForTurn.memberId,
				memberName: memberForTurn.memberName,
				domains: pipeline.activeDomains,
				dataAvailable: false,
				confidence: 0,
				confidenceLevel: 'low' as const,
				timestamp,
				displayTimestamp: new Date(timestamp).toLocaleString('en-US', {
					month: 'short',
					day: 'numeric',
					hour: 'numeric',
					minute: '2-digit',
				}),
			}

			conversationMemory.addTurn(sessionKey, configTurn, {
				intent: pipeline.detection.intent,
				categoryId: pipeline.detection.categoryId,
				metricName: pipeline.detection.metricName,
			})

			return {
				turn: configTurn,
				intent: pipeline.detection.intent,
				implementation: 'grounded-only',
				routing: 'grounded',
				debug: import.meta.env.DEV ? (lastDebugInfo ?? undefined) : undefined,
			}
		}

		let turn = buildGroundedTurn({
			question: input.question,
			knowledge: pipeline.mergedKnowledge,
			member: memberForTurn,
			domains: pipeline.activeDomains,
			dataAvailable: pipeline.dataAvailable,
			confidence: pipeline.detection.confidence,
			uploadedReports: input.uploadedReports,
			personalContext,
			coverage,
		})
		let providerResponse = ''
		let platformObservability: AIObservabilityRecord | undefined
		const productionAiEnabled = shouldUseProductionAi({
			question: input.question,
			legacyIntent: pipeline.detection.intent,
		})
		const productionAiAttempted =
			productionAiEnabled && coverage.displayReadyCount > 0
		const aiConfigured = isAskAiProviderConfigured()
		let usedProvider = productionAiEnabled
			? 'gemini-platform'
			: aiConfigured
				? askAiConfig.provider!
				: 'grounded'

		const betaGroundedTurn =
			betaExperience?.route === 'grounded'
				? buildBetaExperienceTurn({
						experience: betaExperience,
						question: input.question,
						userId: input.userId,
						member: memberForTurn,
						documents: input.documents,
						uploadedReports: (input.uploadedReports ??
							[]) as UploadedHealthReport[],
						storedMetrics: (input.storedMetrics ?? []) as StoredHealthMetric[],
						familyMembers: input.familyMembers,
						onStream: input.onStream,
					})
				: null

		if (betaGroundedTurn) {
			turn = betaGroundedTurn
			usedProvider = 'beta-grounded'
		} else if (productionAiAttempted) {
			try {
				const platformResult = await runProductionHealthAi({
					userId: input.userId,
					question: input.question,
					familyMemberId: memberForTurn.memberId,
					accountOwnerMemberId: input.familyMembers?.find(
						(item) => item.isAccountOwner,
					)?.id,
					memberName: memberForTurn.memberName,
					onStream: input.onStream,
					betaExperienceId: betaExperience?.id,
				})

				providerResponse = JSON.stringify(platformResult.result.response)
				platformObservability = platformResult.result.observability
				turn = attachTrustToTurn(platformResult.turn, {
					knowledge: pipeline.mergedKnowledge,
					question: input.question,
					dataAvailable: pipeline.dataAvailable,
					uploadedReports: input.uploadedReports,
					confidence: platformResult.result.response.confidence,
				})
				usedProvider = platformResult.result.observability.provider

				if (betaExperience) {
					turn = { ...turn, betaExperienceId: betaExperience.id }
				}
			} catch (error) {
				turn = {
					...turn,
					answer: formatPlatformErrorForUser(error),
					confidence: Math.min(turn.confidence, 0.35),
					confidenceLevel: 'low',
				}
				usedProvider = 'gemini-platform-error'
			}
		} else if (aiConfigured) {
			try {
				let streamed = ''

				const response = await aiService.complete({
					messages: prompt.messages,
					responseFormat: 'json',
					cacheKey,
					intent: pipeline.detection.intent,
					retrievedReportCount: knowledge.reports.length,
					retrievedMetricCount: knowledge.metrics.length,
					onStream: input.onStream
						? (chunk) => {
								if (!chunk.done) {
									streamed += chunk.delta
									const partialAnswer =
										extractPartialAnswerFromJsonStream(streamed)

									if (partialAnswer) {
										input.onStream?.(partialAnswer)
									}
								}
							}
						: undefined,
				})

				providerResponse = response.content
				usedProvider = response.provider

				const parsed = parseAiJsonResponse(response.content)

				if (parsed) {
					const verified = verifyCitations(parsed, knowledge)
					const processedAnswer = applyPromptPostProcessing(verified.answer, {
						question: pipeline.resolvedQuestion,
						contextJson: prompt.contextJson,
						dataAvailable: pipeline.dataAvailable,
						memberName: personalContext.activeMember.memberName,
						conversationHistory: [],
						activeDomains: pipeline.activeDomains,
						intent: pipeline.detection.intent,
					})
					const styledAnswer = adaptAnswerForStyle({
						answer: processedAnswer,
						style: preferences.communicationStyle,
						knowledge: pipeline.mergedKnowledge,
						memberName: personalContext.activeMember.memberName,
					})

					turn = attachTrustToTurn(
						{
							...turn,
							answer: styledAnswer,
							confidence:
								typeof verified.confidence === 'number'
									? verified.confidence
									: turn.confidence,
							confidenceLevel: verified.confidenceLevel ?? turn.confidenceLevel,
							citations:
								verified.citations.length > 0
									? citationsFromAiResponse(verified, knowledge)
									: turn.citations,
							relatedReports: verified.citations.map((citation) => ({
								id: citation.reportId,
								title: citation.reportTitle,
								date:
									knowledge.reports.find(
										(report) => report.id === citation.reportId,
									)?.date ??
									citation.date ??
									'',
							})),
						},
						{
							knowledge: pipeline.mergedKnowledge,
							question: input.question,
							dataAvailable: pipeline.dataAvailable,
							uploadedReports: input.uploadedReports,
							confidence: pipeline.detection.confidence,
						},
					)
				}
			} catch {
				turn = buildGroundedTurn({
					question: input.question,
					knowledge: pipeline.mergedKnowledge,
					member: personalContext.activeMember,
					domains: pipeline.activeDomains,
					dataAvailable: pipeline.dataAvailable,
					confidence: Math.max(0.6, pipeline.detection.confidence - 0.1),
					uploadedReports: input.uploadedReports,
					personalContext,
				})
				usedProvider = 'grounded'
			}
		} else if (input.onStream) {
			let streamed = ''

			for (const word of turn.answer.split(' ')) {
				streamed += `${streamed ? ' ' : ''}${word}`
				input.onStream(streamed)
				await new Promise((resolve) => setTimeout(resolve, 16))
			}
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
			memberId: personalContext.activeMember.memberId,
			type: 'ask_question',
			topic: pipeline.detection.metricName ?? pipeline.detection.categoryId,
			reportId: turn.relatedReports[0]?.id,
			timestamp: new Date().toISOString(),
		})

		if (betaExperience) {
			recordBetaExperienceUsage({
				userId: input.userId,
				memberId: personalContext.activeMember.memberId,
				experienceId: betaExperience.id,
				question: input.question,
				provider: usedProvider,
				latencyMs: performance.now() - startedAt,
				promptTokens: platformObservability?.promptTokens,
				completionTokens: platformObservability?.completionTokens,
				totalTokens: platformObservability?.totalTokens,
				estimatedCostUsd: platformObservability?.estimatedCostUsd,
				confidence: turn.confidence,
			})
		}

		if (import.meta.env.DEV) {
			lastDebugInfo = {
				intent: pipeline.detection.intent,
				resolvedQuestion: pipeline.resolvedQuestion,
				retrievedKnowledge: knowledge,
				prompt,
				provider: usedProvider,
				providerResponse,
				turn,
			}
		}

		return {
			turn,
			intent: pipeline.detection.intent,
			implementation: aiConfigured ? 'ai-provider' : 'grounded-only',
			routing: resolveAskRouting(productionAiAttempted),
			debug: import.meta.env.DEV ? (lastDebugInfo ?? undefined) : undefined,
		}
	}
}

function resolveAskRouting(productionAiAttempted: boolean): AskRoutingLabel {
	return productionAiAttempted ? 'production-ai' : 'grounded'
}

export const aiAskReasoningEngine = new AiAskReasoningEngine()
