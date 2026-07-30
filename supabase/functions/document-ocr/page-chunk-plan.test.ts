import { describe, expect, it } from 'vitest'
import {
	mergeOcrChunks,
	planPageChunks,
	splitPageRange,
	type ParsedOcrChunk,
} from './page-chunk-plan.ts'

describe('planPageChunks', () => {
	it('returns a single chunk when page count is within the limit', () => {
		expect(planPageChunks(12, 30)).toEqual([
			{ startPage: 1, endPage: 12, pageCount: 12 },
		])
	})

	it('splits large documents into provider-sized ranges', () => {
		expect(planPageChunks(65, 30)).toEqual([
			{ startPage: 1, endPage: 30, pageCount: 30 },
			{ startPage: 31, endPage: 60, pageCount: 30 },
			{ startPage: 61, endPage: 65, pageCount: 5 },
		])
	})
})

describe('splitPageRange', () => {
	it('bisects a page range for PAGE_LIMIT_EXCEEDED fallback', () => {
		expect(splitPageRange(1, 30)).toEqual([
			{ startPage: 1, endPage: 15, pageCount: 15 },
			{ startPage: 16, endPage: 30, pageCount: 15 },
		])
	})
})

describe('mergeOcrChunks', () => {
	it('merges chunk text and preserves original page numbers', () => {
		const chunks: ParsedOcrChunk[] = [
			{
				rawText: 'Page one text',
				pageCount: 2,
				confidence: 0.9,
				tables: [],
				startPage: 1,
				endPage: 2,
			},
			{
				rawText: 'Page three text',
				pageCount: 1,
				confidence: 0.8,
				tables: [
					{
						pageNumber: 1,
						rows: 2,
						columns: 3,
						cells: [],
					},
				],
				startPage: 3,
				endPage: 3,
			},
		]

		const merged = mergeOcrChunks(chunks, 3)

		expect(merged.rawText).toBe('Page one text\nPage three text')
		expect(merged.pages).toHaveLength(3)
		expect(merged.pages.map((page) => page.pageNumber)).toEqual([1, 2, 3])
		expect(merged.pages[0]?.text).toBe(merged.rawText)
		expect(merged.tables[0]?.pageNumber).toBe(3)
		expect(merged.confidence).toBeCloseTo(0.85)
	})
})
