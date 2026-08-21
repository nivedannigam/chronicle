import {
	buildFinanceDirectExtractionPrompt,
	buildFinanceExtractionPrompt,
	buildInsuranceDirectExtractionPrompt,
	buildInsuranceExtractionPrompt,
	buildVehicleDirectExtractionPrompt,
	buildVehicleExtractionPrompt,
} from '@/shared/ai/prompt/extract-domain-document.prompt'
import {
	isFinanceExtractionSufficient,
	isInsuranceExtractionSufficient,
	isVehicleExtractionSufficient,
	parseFinanceExtractionJson,
	parseInsuranceExtractionJson,
	parseVehicleExtractionJson,
	validateFinanceExtractionJson,
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
import { loadAIPlatformConfig } from '@/shared/ai/config/ai-platform.config'
import { GEMINI_MODEL } from '@/shared/ai/constants/gemini-model'

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

function buildDirectMessages(
	target: DomainDocumentExtractionResult['target'],
	input: {
		fileName: string
		folderPath?: string | null
		categoryHint?: string | null
	},
) {
	if (target === 'insurance') {
		return buildInsuranceDirectExtractionPrompt(input)
	}

	if (target === 'finance') {
		return buildFinanceDirectExtractionPrompt({
			...input,
			documentType: input.categoryHint ?? 'bank-statement',
		})
	}

	return buildVehicleDirectExtractionPrompt(input)
}

function buildTextMessages(
	target: DomainDocumentExtractionResult['target'],
	input: {
		fileName: string
		folderPath?: string | null
		categoryHint?: string | null
		extractedText: string
	},
) {
	if (target === 'insurance') {
		return buildInsuranceExtractionPrompt(input)
	}

	if (target === 'finance') {
		return buildFinanceExtractionPrompt({
			...input,
			documentType: input.categoryHint ?? 'bank-statement',
		})
	}

	return buildVehicleExtractionPrompt(input)
}

function wrapDirectResult(
	target: DomainDocumentExtractionResult['target'],
	json: string,
): DomainDocumentExtractionResult {
	if (target === 'insurance') {
		return {
			target,
			method: 'ai_direct',
			extractedText: null,
			insurance: validateInsuranceExtractionJson(json),
		}
	}

	if (target === 'finance') {
		return {
			target,
			method: 'ai_direct',
			extractedText: null,
			finance: validateFinanceExtractionJson(json),
		}
	}

	return {
		target,
		method: 'ai_direct',
		extractedText: null,
		vehicle: validateVehicleExtractionJson(json),
	}
}

function wrapOcrResult(
	target: DomainDocumentExtractionResult['target'],
	json: string,
	extractedText: string,
): DomainDocumentExtractionResult {
	if (target === 'insurance') {
		const insurance = parseInsuranceExtractionJson(json)
		if (!isInsuranceExtractionSufficient(insurance)) {
			throw new DomainDocumentExtractionError(
				'Insurance extraction returned insufficient structured data.',
			)
		}
		return { target, method: 'ocr_fallback', extractedText, insurance }
	}

	if (target === 'finance') {
		const finance = parseFinanceExtractionJson(json)
		if (!isFinanceExtractionSufficient(finance)) {
			throw new DomainDocumentExtractionError(
				'Finance extraction returned insufficient structured data.',
			)
		}
		return { target, method: 'ocr_fallback', extractedText, finance }
	}

	const vehicle = parseVehicleExtractionJson(json)
	if (!isVehicleExtractionSufficient(vehicle)) {
		throw new DomainDocumentExtractionError(
			'Vehicle extraction returned insufficient structured data.',
		)
	}
	return { target, method: 'ocr_fallback', extractedText, vehicle }
}

export async function extractDomainDocumentWithAiDirect(input: {
	target: DomainDocumentExtractionResult['target']
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
	const messages = buildDirectMessages(input.target, input)

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

		return wrapDirectResult(input.target, stripJsonFence(result.content))
	} catch (error) {
		if (error instanceof AskAiEdgeInvokeError) {
			throw new DomainDocumentExtractionError(error.message)
		}

		throw error
	}
}

export async function extractDomainDocumentWithAi(input: {
	target: DomainDocumentExtractionResult['target']
	fileName: string
	folderPath?: string | null
	categoryHint?: string | null
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
	const messages = buildTextMessages(input.target, input)

	try {
		const result = await invokeAskAiEdgeFunction({
			provider: 'gemini',
			model: config.model || GEMINI_MODEL,
			messages,
			responseFormat: 'json',
			temperature: 0.1,
			maxTokens: 4096,
		})

		return wrapOcrResult(
			input.target,
			stripJsonFence(result.content),
			input.extractedText,
		)
	} catch (error) {
		if (error instanceof AskAiEdgeInvokeError) {
			throw new DomainDocumentExtractionError(error.message)
		}

		throw error
	}
}
