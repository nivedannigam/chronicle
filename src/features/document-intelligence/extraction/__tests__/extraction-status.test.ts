import { describe, expect, it } from 'vitest'
import { resolveExtractionStatus } from '@/features/document-intelligence/extraction/extraction-status.contract'

describe('extraction status', () => {
	it('marks deterministic fallback as needs review when facts would be shown', () => {
		expect(
			resolveExtractionStatus({
				method: 'deterministic_fallback',
				hasStructuredFacts: true,
				hasImportantFacts: true,
				confidence: 0.35,
			}),
		).toBe('NEEDS_REVIEW')
	})

	it('marks successful AI extraction', () => {
		expect(
			resolveExtractionStatus({
				method: 'ai_direct',
				hasStructuredFacts: true,
				hasImportantFacts: true,
				confidence: 0.9,
			}),
		).toBe('AI_SUCCESS')
	})

	it('does not treat missing AI output as success', () => {
		expect(
			resolveExtractionStatus({
				method: 'ocr_fallback',
				hasStructuredFacts: false,
				hasImportantFacts: false,
				confidence: 0,
			}),
		).toBe('AI_FAILED')
	})
})
