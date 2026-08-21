import type { InsurancePolicyRecord } from '@/features/insurance-knowledge/types/insurance-record.types'
import type { FactProvenance } from '@/core/platform/contracts/fact-provenance.contract'
import { provenanceFromExtractionMethod } from '@/core/platform/contracts/fact-provenance.contract'

/**
 * Internal stable identity from filename fallback — NOT a real policy number.
 * Pattern: `{insurerId}:{policyType}:{fileStem}`
 */
export function isInferredInternalPolicyNumber(policyNumber: string): boolean {
	const normalized = policyNumber.trim()

	if (!normalized.includes(':')) {
		return false
	}

	const segments = normalized.split(':')

	return segments.length >= 3
}

export function resolvePolicyNumberProvenance(
	policy: Pick<InsurancePolicyRecord, 'policyNumber' | 'extractionMethod'>,
): FactProvenance {
	const base = provenanceFromExtractionMethod(policy.extractionMethod)

	if (
		base === 'INFERRED' &&
		isInferredInternalPolicyNumber(policy.policyNumber)
	) {
		return 'INFERRED'
	}

	if (
		policy.extractionMethod === 'llm' ||
		policy.extractionMethod === 'layout+llm'
	) {
		return 'AI_EXTRACTED'
	}

	return base
}

/** Consumer-safe policy number — null when value is heuristic-only. */
export function resolveConsumerPolicyNumber(
	policy: Pick<
		InsurancePolicyRecord,
		'policyNumber' | 'extractionMethod' | 'confidence'
	>,
): string | null {
	const provenance = resolvePolicyNumberProvenance(policy)

	if (
		provenance === 'INFERRED' &&
		isInferredInternalPolicyNumber(policy.policyNumber)
	) {
		return null
	}

	if (provenance === 'INFERRED' && policy.confidence < 0.5) {
		return null
	}

	return policy.policyNumber.trim() || null
}

export function resolveConsumerPolicyNumberLabel(
	policy: Pick<
		InsurancePolicyRecord,
		'policyNumber' | 'extractionMethod' | 'confidence'
	>,
): string {
	return resolveConsumerPolicyNumber(policy) ?? 'Needs review'
}
