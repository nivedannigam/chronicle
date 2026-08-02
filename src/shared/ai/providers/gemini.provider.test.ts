import { describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/ai/transport/ask-ai-edge.client', () => ({
	invokeAskAiEdgeFunction: vi.fn(),
	assertAskAiEdgeConfigured: vi.fn(),
	AskAiEdgeConfigurationError: class AskAiEdgeConfigurationError extends Error {
		constructor(message: string) {
			super(message)
			this.name = 'AskAiEdgeConfigurationError'
		}
	},
	isAskAiEdgeConfigured: vi.fn(() => false),
}))

describe('GeminiProvider', () => {
	it('surfaces configuration errors from the ask-ai edge client', async () => {
		const { invokeAskAiEdgeFunction, AskAiEdgeConfigurationError } =
			await import('@/shared/ai/transport/ask-ai-edge.client')
		const { GeminiProvider } =
			await import('@/shared/ai/providers/gemini.provider')

		vi.mocked(invokeAskAiEdgeFunction).mockRejectedValueOnce(
			new AskAiEdgeConfigurationError(
				'Ask AI Edge Function is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.',
			),
		)

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
