import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'

export type CrossModuleEvidenceConfidence = 'high' | 'medium' | 'low'

export interface CrossModuleEvidenceItem {
	module: KnowledgeDomainId | 'documents'
	entity: string
	fact: string
	value: string
	observedAt: string | null
	sourceDocument: string | null
	confidence: CrossModuleEvidenceConfidence
	scope: string | null
	provenance: string
}

export interface CrossModuleEvidenceConflict {
	fact: string
	entity: string
	items: CrossModuleEvidenceItem[]
}

export interface CrossModuleEvidenceBundle {
	items: CrossModuleEvidenceItem[]
	limitations: string[]
	conflicts: CrossModuleEvidenceConflict[]
	headline: string | null
	summaryLines: string[]
}
