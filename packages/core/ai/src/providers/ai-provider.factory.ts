import { askAiConfig, type AskAiProviderType } from '../config/ask-ai'
import {
	createAzureOpenAiProvider,
	createClaudeProvider,
	createGeminiProvider,
	createMockAiProvider,
	createOpenAiProvider,
	type AiProvider,
} from './ai-providers'

export function createAskAiProvider(provider: AskAiProviderType): AiProvider {
	const options = {
		apiKey: askAiConfig.apiKey,
		model: askAiConfig.model,
		proxyUrl: askAiConfig.proxyUrl,
		azureEndpoint: askAiConfig.azureEndpoint,
		azureDeployment: askAiConfig.azureDeployment,
	}

	switch (provider) {
		case 'mock':
			return createMockAiProvider()
		case 'openai':
			return createOpenAiProvider(options)
		case 'azure-openai':
			return createAzureOpenAiProvider(options)
		case 'gemini':
			return createGeminiProvider(options)
		case 'claude':
			return createClaudeProvider(options)
		default: {
			const exhaustive: never = provider
			throw new Error(`Unsupported Ask AI provider: ${exhaustive}`)
		}
	}
}
