import { loadAIPlatformConfig } from '@/shared/ai/config/ai-platform.config'
import { GEMINI_MODEL } from '@/shared/ai/constants/gemini-model'
import {
	buildInsuranceExtractionPrompt,
	buildVehicleExtractionPrompt,
} from '@/shared/ai/prompt/extract-domain-document.prompt'
import {
	parseInsuranceExtractionJson,
	parseVehicleExtractionJson,
} from '@/shared/ai/prompt/extract-domain-document.parser'
import type { DomainDocumentExtractionResult } from '@/shared/ai/types/domain-document-extraction.types'
import {
	AskAiEdgeInvokeError,
	assertAskAiEdgeConfigured,
	invokeAskAiEdgeFunction,
	isAskAiEdgeConfigured,
} from '@/shared/ai/transport/ask-ai-edge.client'

export class DomainDocumentExtractionError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'DomainDocumentExtractionError'
	}
}

function stripJsonFence(content: string): string {
	const trimmed = content.trim()

	if (trimmed.startsWith('```')) {
		return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
	}

	return trimmed
}

export async function extractDomainDocumentWithAi(input: {
	target: 'insurance' | 'vehicles'
	fileName: string
	folderPath?: string | null
	extractedText: string
}): Promise<DomainDocumentExtractionResult> {
	if (!input.extractedText.trim()) {
		throw new DomainDocumentExtractionError(
			'Document text is empty — cannot run AI extraction.',
		)
	}

	if (!isAskAiEdgeConfigured()) {
		throw new DomainDocumentExtractionError(
			'Ask AI is not configured for domain document extraction.',
		)
	}

	assertAskAiEdgeConfigured()
	const config = loadAIPlatformConfig()
	const messages =
		input.target === 'insurance'
			? buildInsuranceExtractionPrompt(input)
			: buildVehicleExtractionPrompt(input)

	try {
		const result = await invokeAskAiEdgeFunction({
			provider: 'gemini',
			model: config.model || GEMINI_MODEL,
			messages,
			responseFormat: 'json',
			temperature: 0.1,
			maxTokens: 4096,
		})

		const json = stripJsonFence(result.content)

		if (input.target === 'insurance') {
			return {
				target: 'insurance',
				method: 'llm',
				extractedText: input.extractedText,
				insurance: parseInsuranceExtractionJson(json),
			}
		}

		return {
			target: 'vehicles',
			method: 'llm',
			extractedText: input.extractedText,
			vehicle: parseVehicleExtractionJson(json),
		}
	} catch (error) {
		if (error instanceof AskAiEdgeInvokeError) {
			throw new DomainDocumentExtractionError(error.message)
		}

		throw error
	}
}
