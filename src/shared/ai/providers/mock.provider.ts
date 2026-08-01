import type {
	AIGenerateRequest,
	AIGenerateResponse,
	AIProvider,
} from '@/shared/ai/types/ai-platform.types'
import type { StructuredAIResponse } from '@/shared/ai/types/structured-response.types'
import { estimateTokenCost } from '@/shared/ai/cost/cost-pricing'

function estimateTokens(text: string): number {
	return Math.max(1, Math.ceil(text.length / 4))
}

function buildMockResponse(input: {
	request: AIGenerateRequest
}): StructuredAIResponse {
	const userMessage =
		input.request.messages.find((message) => message.role === 'user')
			?.content ?? ''

	const isEvidencePrompt = /SelectedEvidence/i.test(userMessage)
	const hasReportEvidence = /"type": "health_report"/i.test(userMessage)
	const hasNoReport =
		/"latestReport": null|"latestReport":null/i.test(userMessage) ||
		(isEvidencePrompt &&
			!hasReportEvidence &&
			/No health reports|no_reports|no display-ready health report/i.test(
				userMessage,
			))

	const hasHealthContext =
		/healthknowledge|metric|report|lab|cholesterol|hba1c|SelectedEvidence/i.test(
			userMessage,
		) && !hasNoReport

	if (hasNoReport) {
		return {
			summary: 'No display-ready health report is available to summarize yet.',
			overallStatus: 'insufficient_data',
			keyFindings: [],
			recommendations: ['Import a laboratory report to enable AI summaries.'],
			followUpQuestions: ['How do I import health reports?'],
			confidence: 0.4,
			limitations: ['No report available in HealthKnowledge.'],
			evidenceReferences: [],
		}
	}

	return {
		summary: hasHealthContext
			? 'Based on the structured HealthKnowledge supplied, your latest report has been reviewed for clinically prioritized findings.'
			: 'Chronicle reviewed the available structured health context.',
		overallStatus: hasHealthContext ? 'stable' : 'insufficient_data',
		keyFindings: hasHealthContext
			? ['Structured metrics from your latest imported report were considered.']
			: ['No domain-specific findings were synthesized in mock mode.'],
		recommendations: [
			'Verify important results with your clinician.',
			'Import additional reports to improve coverage.',
		],
		followUpQuestions: [
			'Which markers need attention?',
			'What changed since my last report?',
		],
		confidence: hasHealthContext ? 0.72 : 0.55,
		limitations: [
			'Mock provider response — configure Gemini for production answers.',
		],
		evidenceReferences: [],
	}
}

export class MockProvider implements AIProvider {
	readonly id = 'mock' as const

	async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
		const startedAt = Date.now()
		const promptText = request.messages
			.map((message) => message.content)
			.join('\n')
		const structured = buildMockResponse({ request })
		const content = JSON.stringify(structured)
		const latencyMs = Math.max(1, Date.now() - startedAt)
		const promptTokens = estimateTokens(promptText)
		const completionTokens = estimateTokens(content)
		const model = request.model ?? 'mock-model'

		return {
			requestId: request.requestId,
			content,
			provider: this.id,
			model,
			usage: {
				promptTokens,
				completionTokens,
				totalTokens: promptTokens + completionTokens,
			},
			latencyMs,
			estimatedCostUsd: estimateTokenCost({
				provider: 'mock',
				model,
				promptTokens,
				completionTokens,
			}),
		}
	}
}
