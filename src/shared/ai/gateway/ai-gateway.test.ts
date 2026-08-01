import { describe, expect, it } from 'vitest'
import { AIGateway } from '@/shared/ai/gateway/ai-gateway'
import {
	clearAIObservabilityLog,
	getAIObservabilityLog,
} from '@/shared/ai/observability/ai-observability'
import { GeminiProvider } from '@/shared/ai/providers/gemini.provider'
import { assertStructuredResponse } from '@/shared/ai/response/response-validator'

describe('AIGateway', () => {
	it('generates structured JSON using MockProvider by default', async () => {
		clearAIObservabilityLog()

		const gateway = new AIGateway({
			provider: 'mock',
			model: 'mock-model',
			timeoutMs: 5_000,
			maxTokens: 1024,
			temperature: 0.2,
			maxRetries: 0,
		})

		const response = await gateway.generate({
			requestId: 'req-1',
			messages: [
				{ role: 'system', content: 'system' },
				{ role: 'user', content: 'HealthKnowledge metrics report' },
			],
			responseFormat: 'json',
			metadata: {
				intent: 'summarize_report',
				knowledgeProvider: 'health-knowledge-provider',
				knowledgeDomain: 'health',
			},
		})

		const structured = assertStructuredResponse(response.content)

		expect(response.provider).toBe('mock')
		expect(structured.summary.length).toBeGreaterThan(0)
		expect(structured.overallStatus).toBeTruthy()
		expect(getAIObservabilityLog().length).toBeGreaterThan(0)
	})

	it('gemini provider requires proxy configuration', async () => {
		const gemini = new GeminiProvider()

		await expect(
			gemini.generate({
				requestId: 'req-2',
				messages: [{ role: 'user', content: 'hello' }],
				responseFormat: 'json',
			}),
		).rejects.toMatchObject({ code: 'not_configured' })
	})
})
