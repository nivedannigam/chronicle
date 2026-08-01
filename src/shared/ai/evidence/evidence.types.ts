import type { ChronicleIntent } from '@/shared/ai/intent/intent.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'

export interface EvidenceItem {
	id: string
	type: string
	label: string
	data: Record<string, unknown>
}

export interface SelectedEvidence {
	domain: KnowledgeDomainId
	intent: ChronicleIntent
	question: string
	memberName?: string | null
	items: EvidenceItem[]
	metadata: EvidenceSelectionMetadata
}

export interface EvidenceSelectionMetadata {
	evidenceCount: number
	excludedItems: string[]
	estimatedTokens: number
	contextSizeChars: number
	selectedKeys: string[]
}

export interface EvidenceSelector<TKnowledge = unknown> {
	readonly domain: KnowledgeDomainId
	select(input: {
		knowledge: TKnowledge
		intent: ChronicleIntent
		question: string
		metricIds?: string[]
		metricNames?: string[]
		timeRangeYears?: number
	}): SelectedEvidence
}
