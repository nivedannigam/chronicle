import { askAiConfig, isAskAiProviderConfigured } from '@/config/ask-ai'
import { aiService } from '@/features/ai/services/ai.service'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'
import { promptBuilder } from '@/features/ask/prompt/prompt-builder'
import {
	detectIntent,
	resolveQuestionWithContext,
} from '@/features/ask/retrieval/intent-detector'
import type { AskReasoningEngine } from '@/features/ask/services/knowledge-query.interface'
import {
	buildGroundedTurn,
	parseAiJsonResponse,
	verifyCitations,
} from '@/features/ask/services/grounded-response.builder'
import type { AskDebugInfo, AskQuestionResult } from '@/features/ask/types'
import { healthKnowledgeRetriever } from '@/features/knowledge/retrieval/health-knowledge-retriever'
import { normalizeMetricName } from '@/features/document-intelligence/extraction/metric-normalization.engine'

let lastDebugInfo: AskDebugInfo | null = null

export function getLastAskDebugInfo(): AskDebugInfo | null {
	return lastDebugInfo
}

export class AiAskReasoningEngine implements AskReasoningEngine {
	async answerQuestion(input: {
		userId: string
		question: string
		onStream?: (partialAnswer: string) => void
		uploadedReports?: import('@/features/health/types').UploadedHealthReport[]
	}): Promise<AskQuestionResult> {
		const previousTopic = conversationMemory.getPreviousTopic(input.userId)
		const resolvedQuestion = resolveQuestionWithContext(
			input.question,
			previousTopic,
		)
		const detection = detectIntent(resolvedQuestion, previousTopic)
		const metricId = detection.metricName
			? (normalizeMetricName(detection.metricName).canonicalId ?? undefined)
			: undefined

		const knowledge = healthKnowledgeRetriever.retrieve({
			userId: input.userId,
			question: resolvedQuestion,
			intent: detection.intent,
			resolvedQuestion,
			categoryId: detection.categoryId,
			metricId,
			metricName: detection.metricName,
			timeRangeYears: detection.timeRangeYears,
			uploadedReports: input.uploadedReports,
		})

		const prompt = promptBuilder.build({
			question: resolvedQuestion,
			knowledge,
			memory: conversationMemory.getTurns(input.userId),
		})

		const cacheKey = `${input.userId}:${detection.intent}:${resolvedQuestion}:${knowledge.metrics.length}:${knowledge.reports.length}`
		let turn = buildGroundedTurn({
			question: input.question,
			knowledge,
			confidence: detection.confidence,
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
					intent: detection.intent,
					retrievedReportCount: knowledge.reports.length,
					retrievedMetricCount: knowledge.metrics.length,
					onStream: input.onStream
						? (chunk) => {
								if (!chunk.done) {
									streamed += chunk.delta
									input.onStream?.(streamed)
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
						answer: `${verified.answer}\n\nThis is informational and not medical advice.`,
						confidence: verified.confidence,
						relatedReports: verified.citations.map((citation) => ({
							id: citation.reportId,
							title: citation.reportTitle,
							date:
								knowledge.reports.find(
									(report) => report.id === citation.reportId,
								)?.date ?? '',
						})),
					}
				}
			} catch {
				turn = buildGroundedTurn({
					question: input.question,
					knowledge,
					confidence: Math.max(0.6, detection.confidence - 0.1),
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

		conversationMemory.addTurn(input.userId, turn, {
			intent: detection.intent,
			categoryId: detection.categoryId,
			metricName: detection.metricName,
		})

		lastDebugInfo = {
			intent: detection.intent,
			resolvedQuestion,
			retrievedKnowledge: knowledge,
			prompt,
			provider: usedProvider,
			providerResponse,
			turn,
		}

		return {
			turn,
			intent: detection.intent,
			implementation: aiConfigured ? 'ai-provider' : 'grounded-only',
			debug: lastDebugInfo,
		}
	}
}

export const aiAskReasoningEngine = new AiAskReasoningEngine()
