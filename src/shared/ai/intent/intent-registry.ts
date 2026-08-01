import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'
import type { IntentClassifier } from '@/shared/ai/intent/intent.types'
import type { EvidenceSelector } from '@/shared/ai/evidence/evidence.types'
import { healthIntentClassifier } from '@/shared/ai/intent/health-intent-classifier'
import { healthEvidenceSelector } from '@/shared/ai/evidence/health-evidence-selector'

export interface DomainIntentEvidencePair {
	classifier: IntentClassifier
	selector: EvidenceSelector
}

const registry = new Map<KnowledgeDomainId, DomainIntentEvidencePair>([
	[
		'health',
		{
			classifier: healthIntentClassifier,
			selector: healthEvidenceSelector,
		},
	],
])

export function registerDomainIntentEvidence(
	domain: KnowledgeDomainId,
	pair: DomainIntentEvidencePair,
): void {
	registry.set(domain, pair)
}

export function getDomainIntentEvidence(
	domain: KnowledgeDomainId,
): DomainIntentEvidencePair | null {
	return registry.get(domain) ?? null
}

/** Future: DocumentIntentClassifier, FinanceIntentClassifier, etc. */
export function listRegisteredIntentDomains(): KnowledgeDomainId[] {
	return [...registry.keys()]
}
