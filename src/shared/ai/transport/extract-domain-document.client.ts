import { loadAIPlatformConfig } from '@/shared/ai/config/ai-platform.config'
import { GEMINI_MODEL } from '@/shared/ai/constants/gemini-model'
import {
	buildInsuranceDirectExtractionPrompt,
	buildInsuranceExtractionPrompt,
	buildVehicleDirectExtractionPrompt,
	buildVehicleExtractionPrompt,
} from '@/shared/ai/prompt/extract-domain-document.prompt'
import {
	isInsuranceExtractionSufficient,
	isVehicleExtractionSufficient,
	parseInsuranceExtractionJson,
	parseVehicleExtractionJson,
	validateInsuranceExtractionJson,
	validateVehicleExtractionJson,
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

export async function extractDomainDocumentWithAiDirect(input: {
	target: 'insurance' | 'vehicles'
	fileName: string
	folderPath?: string | null
	categoryHint?: string | null
	storagePath: string
	bucket: 'health-reports' | 'personal-documents'
}): Promise<DomainDocumentExtractionResult> {
	if (!isAskAiEdgeConfigured()) {
		throw new DomainDocumentExtractionError(
			'Ask AI is not configured for direct document extraction.',
		)
	}

	assertAskAiEdgeConfigured()
	const config = loadAIPlatformConfig()
	const messages =
		input.target === 'insurance'
			? buildInsuranceDirectExtractionPrompt(input)
			: buildVehicleDirectExtractionPrompt(input)

	try {
		const result = await invokeAskAiEdgeFunction({
			provider: 'gemini',
			model: config.model || GEMINI_MODEL,
			messages,
			documentAttachment: {
				bucket: input.bucket,
				storagePath: input.storagePath,
				fileName: input.fileName,
				mimeType: 'application/pdf',
			},
			responseFormat: 'json',
			temperature: 0.1,
			maxTokens: 4096,
		})

		const json = stripJsonFence(result.content)

		if (input.target === 'insurance') {
			return {
				target: 'insurance',
				method: 'ai_direct',
				extractedText: null,
				insurance: validateInsuranceExtractionJson(json),
			}
		}

		return {
			target: 'vehicles',
			method: 'ai_direct',
			extractedText: null,
			vehicle: validateVehicleExtractionJson(json),
		}
	} catch (error) {
		if (error instanceof AskAiEdgeInvokeError) {
			throw new DomainDocumentExtractionError(error.message)
		}

		throw error
	}
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
			const insurance = parseInsuranceExtractionJson(json)

			if (!isInsuranceExtractionSufficient(insurance)) {
				throw new DomainDocumentExtractionError(
					'Insurance extraction returned insufficient structured data.',
				)
			}

			return {
				target: 'insurance',
				method: 'ocr_fallback',
				extractedText: input.extractedText,
				insurance,
			}
		}

		const vehicle = parseVehicleExtractionJson(json)

		if (!isVehicleExtractionSufficient(vehicle)) {
			throw new DomainDocumentExtractionError(
				'Vehicle extraction returned insufficient structured data.',
			)
		}

		return {
			target: 'vehicles',
			method: 'ocr_fallback',
			extractedText: input.extractedText,
			vehicle,
		}
	} catch (error) {
		if (error instanceof AskAiEdgeInvokeError) {
			throw new DomainDocumentExtractionError(error.message)
		}

		throw error
	}
}
