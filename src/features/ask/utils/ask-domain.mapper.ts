import type { KnowledgeDomain } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'

const DOMAIN_MAP: Partial<Record<KnowledgeDomainId, KnowledgeDomain>> = {
	health: 'health',
	insurance: 'insurance',
	vehicles: 'vehicles',
	finance: 'finance',
	identity: 'identity',
	property: 'property',
	documents: 'documents',
	travel: 'travel',
}

export function toAskKnowledgeDomains(
	domains: KnowledgeDomainId[],
): KnowledgeDomain[] {
	return [
		...new Set(domains.map((domain) => DOMAIN_MAP[domain]).filter(Boolean)),
	] as KnowledgeDomain[]
}
