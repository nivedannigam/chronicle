import { describe, expect, it } from 'vitest'
import { resolveClassificationPrecedence } from '@/features/document-intelligence/classification/classification-precedence.contract'

describe('classification precedence', () => {
	it('prefers content-derived classification over folder/filename', () => {
		const decision = resolveClassificationPrecedence([
			{
				classification: 'motor',
				source: 'FOLDER',
				confidence: 0.9,
				provenance: 'INFERRED',
				needsReview: false,
			},
			{
				classification: 'health',
				source: 'CONTENT_AI',
				confidence: 0.88,
				provenance: 'AI_EXTRACTED',
				needsReview: false,
			},
		])

		expect(decision.classification).toBe('health')
		expect(decision.source).toBe('CONTENT_AI')
	})

	it('marks uncertain classifications as needs review', () => {
		const decision = resolveClassificationPrecedence([
			{
				classification: 'other',
				source: 'FILENAME',
				confidence: 0.2,
				provenance: 'INFERRED',
				needsReview: false,
			},
		])

		expect(decision.needsReview).toBe(true)
		expect(decision.provenance).toBe('NEEDS_REVIEW')
	})
})
