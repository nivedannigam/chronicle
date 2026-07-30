import { describe, expect, it } from 'vitest'
import {
	formatOcrUserMessage,
	GOOGLE_DOCUMENT_AI_LIMITS,
	planOcrPageChunks,
	resolveProviderPageLimit,
} from './provider-limits.ts'

describe('provider-limits', () => {
	it('uses 30 pages when imageless mode is enabled', () => {
		expect(resolveProviderPageLimit(GOOGLE_DOCUMENT_AI_LIMITS, true)).toBe(30)
		expect(resolveProviderPageLimit(GOOGLE_DOCUMENT_AI_LIMITS, false)).toBe(15)
	})

	it('plans a two-chunk split for a 22-page report at the standard limit', () => {
		expect(planOcrPageChunks(22, 15)).toEqual([
			{ startPage: 1, endPage: 15, pageCount: 15 },
			{ startPage: 16, endPage: 22, pageCount: 7 },
		])
	})

	it('keeps 22 pages in one chunk when imageless limit applies', () => {
		expect(planOcrPageChunks(22, 30)).toEqual([
			{ startPage: 1, endPage: 22, pageCount: 22 },
		])
	})

	it('formats page limit errors for users', () => {
		expect(
			formatOcrUserMessage('PAGE_LIMIT_EXCEEDED limit: 15 got 22', 22),
		).toBe(
			'This report contains 22 pages. Chronicle is processing it in multiple OCR batches.',
		)
	})
})
