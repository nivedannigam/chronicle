import { DOCUMENTS_BUCKET } from '@/features/documents/types/document.types'
import { resolveDocumentContent } from '@/features/document-intelligence/content/resolve-document-content.service'
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
import { resolveExtractionStatus } from '@/features/document-intelligence/extraction/extraction-status.contract'

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
	contentSource?: string | null
	extractionStatus?: DocumentExtractionObservability['extractionStatus']
}): DocumentExtractionObservability {
	return {
		extractionMethod: input.method,
		extractionSuccess: input.success,
		attemptCount: input.attemptCount,
		fallbackReason: input.fallbackReason ?? null,
		processingDurationMs: Math.round(performance.now() - input.startedAt),
		provider: 'gemini',
		model: input.model ?? null,
		contentSource: input.contentSource ?? null,
		extractionStatus: input.extractionStatus ?? null,
	}
}

async function extractDomainDocumentFromResolvedContent(input: {
	target: DomainDocumentExtractionResult['target']
	userId: string
	documentId: string
	fileName: string
	folderPath?: string | null
	categoryHint?: string | null
	storagePath: string
}): Promise<{
	extraction: DomainDocumentExtractionResult
	contentSource: string | null
}> {
	const resolved = await resolveDocumentContent({
		userId: input.userId,
		documentId: input.documentId,
		fileName: input.fileName,
		storagePath: input.storagePath,
	})

	if (resolved.content.trim().length < 80) {
		throw new DocumentExtractionOrchestratorError(
			'Document text was too short for structured extraction.',
		)
	}

	const extraction = await extractDomainDocumentWithAi({
		target: input.target,
		fileName: input.fileName,
		folderPath: input.folderPath,
		categoryHint: input.categoryHint,
		extractedText: resolved.content,
	})

	return {
		extraction,
		contentSource: resolved.source,
	}
}

export interface OrchestrateDomainDocumentExtractionInput {
	target: DomainDocumentExtractionResult['target']
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
				const resolvedExtraction =
					await extractDomainDocumentFromResolvedContent(input)
				const ocrExtraction = resolvedExtraction.extraction
				const contentSource = resolvedExtraction.contentSource

				return {
					...ocrExtraction,
					method: 'ocr_fallback',
					observability: buildObservability({
						method: 'ocr_fallback',
						success: true,
						attemptCount,
						startedAt,
						fallbackReason,
						contentSource,
						extractionStatus: resolveExtractionStatus({
							method: 'ocr_fallback',
							hasStructuredFacts: Boolean(
								ocrExtraction.insurance ||
								ocrExtraction.vehicle ||
								ocrExtraction.finance,
							),
							hasImportantFacts: true,
							confidence:
								ocrExtraction.insurance?.confidence ??
								ocrExtraction.vehicle?.confidence ??
								ocrExtraction.finance?.confidence ??
								0.5,
						}),
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
					extractionStatus: 'NEEDS_REVIEW',
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
			extractionStatus: 'NEEDS_REVIEW',
		}),
	}
}

export { HEALTH_REPORTS_BUCKET }
