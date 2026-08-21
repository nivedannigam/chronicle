/** Internal AI extraction outcome — maps to consumer "Organizing / Needs review / Ready". */
export type DocumentExtractionStatus =
	'AI_SUCCESS' | 'AI_PARTIAL' | 'AI_FAILED' | 'NEEDS_REVIEW'

export function resolveExtractionStatus(input: {
	method: string
	hasStructuredFacts: boolean
	hasImportantFacts: boolean
	confidence: number
}): DocumentExtractionStatus {
	if (
		input.method === 'deterministic_fallback' ||
		input.method === 'metadata_fallback'
	) {
		return input.hasImportantFacts ? 'NEEDS_REVIEW' : 'AI_FAILED'
	}

	if (
		input.method === 'ai_direct' ||
		input.method === 'ocr_fallback' ||
		input.method === 'llm'
	) {
		if (!input.hasStructuredFacts) {
			return 'AI_FAILED'
		}

		if (input.confidence >= 0.7 && input.hasImportantFacts) {
			return 'AI_SUCCESS'
		}

		return 'AI_PARTIAL'
	}

	return input.hasStructuredFacts ? 'AI_PARTIAL' : 'NEEDS_REVIEW'
}
