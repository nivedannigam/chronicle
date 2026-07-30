import {
	EdgeFunctionInvokeError,
	type EdgeFunctionInvoker,
} from '@chronicle/core-storage'
import type { OcrDocumentInput } from '../types/ocr-document-input.types'
import type { DocumentOCRProvider } from './document-ocr-provider.interface'
import { OcrProviderError } from '../types/ocr-errors.types'
import type { OcrDocumentResult } from '../types/ocr-result.types'

const OCR_SETUP_MESSAGE =
	'OCR unavailable. Deploy the document-ocr edge function and configure GOOGLE_DOCUMENT_AI_* secrets in Supabase, then reprocess reports.'

export interface GoogleDocumentAiProviderOptions {
	storageBucket: string
	invokeEdgeFunction: EdgeFunctionInvoker
}

export class GoogleDocumentAIProvider implements DocumentOCRProvider {
	readonly name = 'google-document-ai'
	private readonly options: GoogleDocumentAiProviderOptions

	constructor(options: GoogleDocumentAiProviderOptions) {
		this.options = options
	}

	async extractText(document: OcrDocumentInput): Promise<OcrDocumentResult> {
		return this.extractDocument(document)
	}

	async extractDocument(
		document: OcrDocumentInput,
	): Promise<OcrDocumentResult> {
		const startedAt = performance.now()
		const requestPayload = {
			storagePath: document.storagePath,
			fileName: document.fileName,
			mimeType: document.mimeType,
			bucket: this.options.storageBucket,
		}

		try {
			const payload = await this.options.invokeEdgeFunction<
				OcrDocumentResult & { error?: string }
			>('document-ocr', requestPayload)

			return {
				...payload,
				metadata: {
					...payload.metadata,
					provider: payload.metadata?.provider ?? this.name,
				},
				processingTimeMs:
					payload.processingTimeMs ?? Math.round(performance.now() - startedAt),
			}
		} catch (error) {
			if (error instanceof EdgeFunctionInvokeError) {
				const isNotConfigured =
					error.httpStatus === 503 || error.message.includes('not configured')

				throw new OcrProviderError(
					error.toDebugString(),
					isNotConfigured ? 'provider_not_configured' : 'ocr_failure',
					!isNotConfigured,
				)
			}

			throw new OcrProviderError(
				error instanceof Error
					? error.message
					: 'Google Document AI request failed.',
				'ocr_failure',
				true,
			)
		}
	}

	getConfidence(result: OcrDocumentResult): number {
		return result.confidence
	}
}

export { OCR_SETUP_MESSAGE }
