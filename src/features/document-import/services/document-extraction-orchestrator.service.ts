import { DOCUMENTS_BUCKET } from '@/features/documents/types/document.types'
import { extractTextFromStoredPdf } from '@/features/document-import/services/domain-document-text.service'
import {
	extractDomainDocumentWithAi,
	extractDomainDocumentWithAiDirect,
} from '@/shared/ai/transport/extract-domain-document.client'
import type { DomainDocumentExtractionResult } from '@/shared/ai/types/domain-document-extraction.types'
import type {
	DocumentExtractionMethod,
	DocumentExtractionObservability,
} from '@/shared/ai/types/document-extraction.types'
import {
	AskAiEdgeInvokeError,
	isAskAiEdgeConfigured,
} from '@/shared/ai/transport/ask-ai-edge.client'

export class DocumentExtractionOrchestratorError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'DocumentExtractionOrchestratorError'
	}
}

const HEALTH_REPORTS_BUCKET = 'health-reports' as const

function buildObservability(input: {
	method: DocumentExtractionMethod
	success: boolean
	attemptCount: number
	startedAt: number
	fallbackReason?: string | null
	model?: string | null
}): DocumentExtractionObservability {
	return {
		extractionMethod: input.method,
		extractionSuccess: input.success,
		attemptCount: input.attemptCount,
		fallbackReason: input.fallbackReason ?? null,
		processingDurationMs: Math.round(performance.now() - input.startedAt),
		provider: 'gemini',
		model: input.model ?? null,
	}
}

async function extractDomainDocumentFromOcrText(input: {
	target: 'insurance' | 'vehicles'
	userId: string
	documentId: string
	fileName: string
	folderPath?: string | null
	storagePath: string
}): Promise<DomainDocumentExtractionResult> {
	const { text } = await extractTextFromStoredPdf({
		userId: input.userId,
		documentId: input.documentId,
		fileName: input.fileName,
		storagePath: input.storagePath,
	})

	if (text.trim().length < 80) {
		throw new DocumentExtractionOrchestratorError(
			'OCR text was too short for structured extraction.',
		)
	}

	return extractDomainDocumentWithAi({
		target: input.target,
		fileName: input.fileName,
		folderPath: input.folderPath,
		extractedText: text,
	})
}

export interface OrchestrateDomainDocumentExtractionInput {
	target: 'insurance' | 'vehicles'
	userId: string
	documentId: string
	fileName: string
	folderPath?: string | null
	categoryHint?: string | null
	storagePath: string
	bucket?: 'health-reports' | 'personal-documents'
	buildMetadataFallback: () => DomainDocumentExtractionResult
}

export async function orchestrateDomainDocumentExtraction(
	input: OrchestrateDomainDocumentExtractionInput,
): Promise<DomainDocumentExtractionResult> {
	const startedAt = performance.now()
	let attemptCount = 0

	if (isAskAiEdgeConfigured()) {
		attemptCount += 1

		try {
			const direct = await extractDomainDocumentWithAiDirect({
				target: input.target,
				fileName: input.fileName,
				folderPath: input.folderPath,
				categoryHint: input.categoryHint,
				storagePath: input.storagePath,
				bucket: input.bucket ?? DOCUMENTS_BUCKET,
			})

			return {
				...direct,
				observability: buildObservability({
					method: 'ai_direct',
					success: true,
					attemptCount,
					startedAt,
				}),
			}
		} catch (error) {
			const fallbackReason =
				error instanceof AskAiEdgeInvokeError
					? error.message
					: error instanceof Error
						? error.message
						: 'ai_direct_failed'

			attemptCount += 1

			try {
				const ocrExtraction = await extractDomainDocumentFromOcrText(input)

				return {
					...ocrExtraction,
					observability: buildObservability({
						method: 'ocr_fallback',
						success: true,
						attemptCount,
						startedAt,
						fallbackReason,
					}),
				}
			} catch {
				// Fall through to deterministic metadata fallback.
			}

			const fallback = input.buildMetadataFallback()

			return {
				...fallback,
				method: 'deterministic_fallback',
				observability: buildObservability({
					method: 'deterministic_fallback',
					success: false,
					attemptCount,
					startedAt,
					fallbackReason,
				}),
			}
		}
	}

	const fallback = input.buildMetadataFallback()

	return {
		...fallback,
		method: 'deterministic_fallback',
		observability: buildObservability({
			method: 'deterministic_fallback',
			success: false,
			attemptCount,
			startedAt,
			fallbackReason: 'ask_ai_not_configured',
		}),
	}
}

export { HEALTH_REPORTS_BUCKET }
