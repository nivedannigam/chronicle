import { describe, expect, it, vi } from 'vitest'
import { resolveDocumentContent } from '@/features/document-intelligence/content/resolve-document-content.service'

vi.mock('@/features/document-intelligence', async () => {
	const actual = await vi.importActual<
		typeof import('@/features/document-intelligence')
	>('@/features/document-intelligence')

	return {
		...actual,
		runOcrWithRetry: vi.fn(),
		createDocumentFromUpload: vi.fn((input) => ({
			id: input.id,
			userId: input.userId,
			fileName: input.fileName,
			storagePath: input.storagePath,
			uploadedAt: input.uploadedAt,
			mimeType: input.mimeType ?? 'application/pdf',
		})),
	}
})

import { runOcrWithRetry } from '@/features/document-intelligence'

describe('resolveDocumentContent', () => {
	it('maps native PDF provider to NATIVE_TEXT source', async () => {
		vi.mocked(runOcrWithRetry).mockResolvedValueOnce({
			result: {
				rawText: 'Policy Number POL 123456\nInsurer ICICI Lombard\n'.repeat(8),
				pages: [{ pageNumber: 1, text: 'page', confidence: 0.95 }],
				tables: [],
				confidence: 0.95,
				metadata: {
					provider: 'native-pdf-text',
					mimeType: 'application/pdf',
					fileName: 'policy.pdf',
					pageCount: 1,
					tableCount: 0,
				},
				processingTimeMs: 12,
			},
			attempts: 1,
		})

		const resolved = await resolveDocumentContent({
			userId: 'user-1',
			documentId: 'doc-1',
			fileName: 'policy.pdf',
			storagePath: 'users/user-1/policy.pdf',
		})

		expect(resolved.source).toBe('NATIVE_TEXT')
		expect(resolved.metadata.provider).toBe('native-pdf-text')
	})

	it('maps Google Document AI provider to OCR source', async () => {
		vi.mocked(runOcrWithRetry).mockResolvedValueOnce({
			result: {
				rawText: 'scanned policy text',
				pages: [
					{ pageNumber: 1, text: 'scanned policy text', confidence: 0.8 },
				],
				tables: [],
				confidence: 0.8,
				metadata: {
					provider: 'google-document-ai',
					mimeType: 'application/pdf',
					fileName: 'scan.pdf',
					pageCount: 1,
					tableCount: 0,
				},
				processingTimeMs: 1200,
			},
			attempts: 1,
		})

		const resolved = await resolveDocumentContent({
			userId: 'user-1',
			documentId: 'doc-2',
			fileName: 'scan.pdf',
			storagePath: 'users/user-1/scan.pdf',
		})

		expect(resolved.source).toBe('OCR')
	})
})
