import type {
	AIGenerateRequest,
	AIGenerateResponse,
	AIProvider,
} from '@/shared/ai/types/ai-platform.types'

abstract class StubProvider implements AIProvider {
	abstract readonly id: AIProvider['id']

	async generate(request: AIGenerateRequest): Promise<AIGenerateResponse> {
		void request
		throw new Error(
			`${this.id} provider is not implemented yet. Set AI_PROVIDER=mock for offline operation.`,
		)
	}
}

export class OpenAIProvider extends StubProvider {
	readonly id = 'openai' as const

	// TODO: Implement OpenAI chat completions with structured JSON output.
}

export class GeminiProvider extends StubProvider {
	readonly id = 'gemini' as const

	// TODO: Implement Google Gemini generateContent with JSON schema response.
}

export class ClaudeProvider extends StubProvider {
	readonly id = 'claude' as const

	// TODO: Implement Anthropic messages API with structured output.
}
