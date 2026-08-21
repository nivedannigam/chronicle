import {
	createDocumentFromUpload,
	defaultOCRProvider,
	runOcrWithRetry,
} from '@/features/document-intelligence'
import type {
	DocumentContentSource,
	ResolvedDocumentContent,
} from '@/features/document-intelligence/content/document-content.contract'
import { resolveContentSourceFromProvider } from '@/features/document-intelligence/content/document-content.contract'

export interface ResolveDocumentContentInput {
	userId: string
	documentId: string
	fileName: string
	storagePath: string
	uploadedAt?: string
	mimeType?: string | null
}

export async function resolveDocumentContent(
	input: ResolveDocumentContentInput,
): Promise<ResolvedDocumentContent> {
	const document = createDocumentFromUpload({
		id: input.documentId,
		userId: input.userId,
		fileName: input.fileName,
		storagePath: input.storagePath,
		uploadedAt: input.uploadedAt ?? new Date().toISOString(),
		mimeType: input.mimeType ?? undefined,
	})

	const { result, attempts } = await runOcrWithRetry(
		defaultOCRProvider,
		document,
		{
			maxRetries: 1,
		},
	)

	const provider =
		typeof result.metadata.provider === 'string'
			? result.metadata.provider
			: null
	const source: DocumentContentSource =
		resolveContentSourceFromProvider(provider)

	return {
		content: result.rawText ?? '',
		source,
		confidence: result.confidence ?? null,
		metadata: {
			provider,
			pageCount: result.pages.length,
			tableCount: result.tables.length,
			processingTimeMs: result.processingTimeMs,
		},
		ocrDocument: result,
		ocrAttempts: attempts,
	}
}
