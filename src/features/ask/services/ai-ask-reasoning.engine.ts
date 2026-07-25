import { askAiConfig, isAskAiProviderConfigured } from '@/config/ask-ai'
import { aiService } from '@/features/ai/services/ai.service'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'
import { promptBuilder } from '@/features/ask/prompt/prompt-builder'
import type { AskReasoningEngine } from '@/features/ask/services/knowledge-query.interface'
import {
	buildGroundedTurn,
	citationsFromAiResponse,
	extractPartialAnswerFromJsonStream,
	parseAiJsonResponse,
	verifyCitations,
} from '@/features/ask/services/grounded-response.builder'
import type { AskDebugInfo, AskQuestionResult } from '@/features/ask/types'
import {
	buildMemorySessionKey,
	resolveMemberFromQuestion,
} from '@/features/intelligence/services/member-context.service'
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
	}): Promise<AskQuestionResult> {
		const member = resolveMemberFromQuestion({
			question: input.question,
			selectedMemberId: input.memberId ?? null,
			selectedMemberName: input.memberName ?? null,
			members: input.familyMembers ?? [],
		})

		const pipeline = runIntelligencePipeline({
			userId: input.userId,
			question: input.question,
			member,
			sources: buildIntelligenceSources({
				uploadedReports: input.uploadedReports,
				connectorDocuments: input.connectorDocuments,
			}),
		})

		const sessionKey = buildMemorySessionKey(input.userId, member.memberId)
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
			member,
			dataAvailable: pipeline.dataAvailable,
		})

		const cacheKey = `${sessionKey}:${pipeline.detection.intent}:${pipeline.resolvedQuestion}:${knowledge.metrics.length}:${knowledge.reports.length}`
		let turn = buildGroundedTurn({
			question: input.question,
			knowledge: pipeline.mergedKnowledge,
			member,
			domains: pipeline.activeDomains,
			dataAvailable: pipeline.dataAvailable,
			confidence: pipeline.detection.confidence,
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

					turn = {
						...turn,
						answer: verified.answer.endsWith('not medical advice.')
							? verified.answer
							: `${verified.answer}\n\nThis is informational and not medical advice.`,
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
					}
				}
			} catch {
				turn = buildGroundedTurn({
					question: input.question,
					knowledge: pipeline.mergedKnowledge,
					member,
					domains: pipeline.activeDomains,
					dataAvailable: pipeline.dataAvailable,
					confidence: Math.max(0.6, pipeline.detection.confidence - 0.1),
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
		})

		lastDebugInfo = {
			intent: pipeline.detection.intent,
			resolvedQuestion: pipeline.resolvedQuestion,
			retrievedKnowledge: knowledge,
			prompt,
			provider: usedProvider,
			providerResponse,
			turn,
		}

		return {
			turn,
			intent: pipeline.detection.intent,
			implementation: aiConfigured ? 'ai-provider' : 'grounded-only',
			debug: lastDebugInfo,
		}
	}
}

export const aiAskReasoningEngine = new AiAskReasoningEngine()
