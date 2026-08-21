/**
 * Fact Provenance Contract
 *
 * Internal vocabulary for where important facts originated.
 * Do not expose these labels directly in consumer UI unless useful.
 */

export type FactProvenance =
	'CONFIRMED' | 'AI_EXTRACTED' | 'USER_PROVIDED' | 'INFERRED' | 'NEEDS_REVIEW'

/** Provenance strong enough to present as a factual answer in Ask. */
export const TRUSTED_ASK_PROVENANCE: ReadonlySet<FactProvenance> = new Set([
	'CONFIRMED',
	'AI_EXTRACTED',
	'USER_PROVIDED',
])

export function isTrustedAskProvenance(provenance: FactProvenance): boolean {
	return TRUSTED_ASK_PROVENANCE.has(provenance)
}

export function provenanceFromExtractionMethod(
	method: string | null | undefined,
): FactProvenance {
	switch (method) {
		case 'llm':
		case 'layout+llm':
		case 'ai_direct':
		case 'ocr_fallback':
			return 'AI_EXTRACTED'
		case 'deterministic':
		case 'deterministic_fallback':
		case 'metadata':
			return 'INFERRED'
		case 'manual':
		case 'user':
			return 'USER_PROVIDED'
		default:
			return 'NEEDS_REVIEW'
	}
}
