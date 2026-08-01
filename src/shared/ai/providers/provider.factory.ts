import type {
	AIProvider,
	AIProviderId,
} from '@/shared/ai/types/ai-platform.types'
import { ClaudeProvider } from '@/shared/ai/providers/stub.providers'
import { GeminiProvider } from '@/shared/ai/providers/gemini.provider'
import { MockProvider } from '@/shared/ai/providers/mock.provider'
import { OpenAIProvider } from '@/shared/ai/providers/stub.providers'

const mockProvider = new MockProvider()
const openaiProvider = new OpenAIProvider()
const geminiProvider = new GeminiProvider()
const claudeProvider = new ClaudeProvider()

export function createAIProvider(providerId: AIProviderId): AIProvider {
	switch (providerId) {
		case 'openai':
			return openaiProvider
		case 'gemini':
			return geminiProvider
		case 'claude':
			return claudeProvider
		case 'mock':
		default:
			return mockProvider
	}
}
