import { supabase } from '@/lib/supabase'
import type { Document } from '@/features/document-intelligence/domain'
import type { DocumentOCRProvider } from '@/features/document-intelligence/ocr/providers/document-ocr-provider.interface'
import { OcrProviderError } from '@/features/document-intelligence/ocr/types/ocr-errors.types'
import type { OcrDocumentResult } from '@/features/document-intelligence/ocr/types/ocr-result.types'
import { HEALTH_REPORTS_BUCKET } from '@/features/health/types'

const OCR_SETUP_MESSAGE =
	'OCR unavailable. Deploy the document-ocr edge function and configure GOOGLE_DOCUMENT_AI_* secrets in Supabase, then reprocess reports.'

export class GoogleDocumentAIProvider implements DocumentOCRProvider {
	readonly name = 'google-document-ai'

	async extractText(document: Document): Promise<OcrDocumentResult> {
		return this.extractDocument(document)
	}

	async extractDocument(document: Document): Promise<OcrDocumentResult> {
		const startedAt = performance.now()

		const { data, error } = await supabase.functions.invoke('document-ocr', {
			body: {
				storagePath: document.storagePath,
				fileName: document.fileName,
				mimeType: document.mimeType,
				bucket: HEALTH_REPORTS_BUCKET,
			},
		})

		if (error) {
			throw new OcrProviderError(
				error.message ?? 'Google Document AI request failed.',
				'ocr_failure',
				true,
			)
		}

		if (!data || typeof data !== 'object') {
			throw new OcrProviderError(
				'Empty OCR response from document-ocr function.',
				'ocr_failure',
				true,
			)
		}

		const payload = data as OcrDocumentResult & { error?: string }

		if ('error' in payload && payload.error) {
			throw new OcrProviderError(
				String(payload.error),
				'provider_not_configured',
				false,
			)
		}

		return {
			...payload,
			metadata: {
				...payload.metadata,
				provider: payload.metadata?.provider ?? this.name,
			},
			processingTimeMs:
				payload.processingTimeMs ?? Math.round(performance.now() - startedAt),
		}
	}

	getConfidence(result: OcrDocumentResult): number {
		return result.confidence
	}
}

export const googleDocumentAIProvider = new GoogleDocumentAIProvider()

export { OCR_SETUP_MESSAGE }
