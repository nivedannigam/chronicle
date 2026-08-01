import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/shared/ai/config/ai-platform.config', () => ({
	loadAIPlatformConfig: vi.fn(() => ({
		provider: 'gemini',
		model: 'gemini-2.0-flash',
		timeoutMs: 30_000,
		maxTokens: 4096,
		temperature: 0.2,
		maxRetries: 1,
		proxyUrl: 'https://example.com/ask-ai',
	})),
}))

import {
	GeminiProvider,
	GeminiProviderError,
} from '@/shared/ai/providers/gemini.provider'
import { loadAIPlatformConfig } from '@/shared/ai/config/ai-platform.config'

describe('GeminiProvider', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
		vi.mocked(loadAIPlatformConfig).mockReturnValue({
			provider: 'gemini',
			model: 'gemini-2.0-flash',
			timeoutMs: 30_000,
			maxTokens: 4096,
			temperature: 0.2,
			maxRetries: 1,
			proxyUrl: 'https://example.com/ask-ai',
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('throws not_configured when proxy URL is missing', async () => {
		vi.mocked(loadAIPlatformConfig).mockReturnValue({
			provider: 'gemini',
			model: 'gemini-2.0-flash',
			timeoutMs: 30_000,
			maxTokens: 4096,
			temperature: 0.2,
			maxRetries: 1,
			proxyUrl: '',
		})

		const provider = new GeminiProvider()

		await expect(
			provider.generate({
				requestId: 'req-1',
				messages: [{ role: 'user', content: 'hello' }],
				responseFormat: 'json',
			}),
		).rejects.toMatchObject({ code: 'not_configured' })
	})

	it('returns structured response from proxy', async () => {
		const mockFetch = vi.mocked(fetch)
		mockFetch.mockResolvedValue(
			new Response(
				JSON.stringify({
					content: JSON.stringify({
						summary: 'Test summary',
						overallStatus: 'stable',
						keyFindings: ['Finding'],
						recommendations: [],
						followUpQuestions: [],
						confidence: 0.8,
						limitations: [],
						evidenceReferences: [],
					}),
					provider: 'gemini',
					model: 'gemini-2.0-flash',
					usage: {
						promptTokens: 100,
						completionTokens: 50,
						totalTokens: 150,
					},
					latencyMs: 200,
				}),
				{ status: 200 },
			),
		)

		const provider = new GeminiProvider()
		const response = await provider.generate({
			requestId: 'req-2',
			messages: [{ role: 'user', content: 'Summarize report' }],
			responseFormat: 'json',
			model: 'gemini-2.0-flash',
		})

		expect(response.provider).toBe('gemini')
		expect(response.usage.promptTokens).toBe(100)
		expect(response.estimatedCostUsd).toBeGreaterThan(0)
	})

	it('maps rate limit errors', async () => {
		vi.mocked(fetch).mockResolvedValue(
			new Response('rate limit exceeded', { status: 429 }),
		)

		const provider = new GeminiProvider()

		await expect(
			provider.generate({
				requestId: 'req-3',
				messages: [{ role: 'user', content: 'hello' }],
				responseFormat: 'json',
			}),
		).rejects.toBeInstanceOf(GeminiProviderError)
	})
})
