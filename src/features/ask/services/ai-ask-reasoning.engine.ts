import { askAiConfig, isAskAiProviderConfigured } from '@/config/ask-ai'
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
import type { AskDebugInfo, AskQuestionResult } from '@/features/ask/types'
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
		uploadedReports?: import('@/features/health/types').UploadedHealthReport[]
		connectorDocuments?: import('@/core/connectors').ConnectorDocumentRecord[]
		documents?: import('@/features/documents/types/document.types').ChronicleDocument[]
		personalPreferences?: ChroniclePersonalPreferences
	}): Promise<AskQuestionResult> {
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
					debug: import.meta.env.DEV ? (lastDebugInfo ?? undefined) : undefined,
				}
			}
		}

		const cacheKey = `${sessionKey}:${pipeline.detection.intent}:${pipeline.resolvedQuestion}:${knowledge.metrics.length}:${knowledge.reports.length}`
		let turn = buildGroundedTurn({
			question: input.question,
			knowledge: pipeline.mergedKnowledge,
			member: personalContext.activeMember,
			domains: pipeline.activeDomains,
			dataAvailable: pipeline.dataAvailable,
			confidence: pipeline.detection.confidence,
			uploadedReports: input.uploadedReports,
			personalContext,
		})
		let providerResponse = ''
		const aiConfigured = isAskAiProviderConfigured()
		let usedProvider = aiConfigured ? askAiConfig.provider! : 'grounded'

		if (aiConfigured) {
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
					const styledAnswer = adaptAnswerForStyle({
						answer: verified.answer.endsWith('not medical advice.')
							? verified.answer
							: `${verified.answer}\n\nThis is informational and not medical advice.`,
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
			debug: import.meta.env.DEV ? (lastDebugInfo ?? undefined) : undefined,
		}
	}
}

export const aiAskReasoningEngine = new AiAskReasoningEngine()
