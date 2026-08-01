import type {
	IntentId,
	KnowledgeDomainId,
} from '@/shared/ai/types/ai-platform.types'

export interface KnowledgeEvidenceItem {
	id: string
	sourceType: string
	label: string
	excerpt?: string
	date?: string
	metricName?: string
	metricValue?: string
}

export interface KnowledgeMetric {
	id: string
	displayName: string
	value: string
	unit: string | null
	status: string
	categoryId?: string
	reportId?: string
	observedAt?: string
}

export interface KnowledgeReport {
	id: string
	title: string
	date: string
	lab: string
	summary?: string
}

export interface NormalizedKnowledge {
	domain: KnowledgeDomainId
	intent: IntentId
	question: string
	reports: KnowledgeReport[]
	metrics: KnowledgeMetric[]
	insights: string[]
	alerts: string[]
	evidence: KnowledgeEvidenceItem[]
	summaryLines: string[]
	coverageNotes: string[]
	dataAvailable: boolean
}

export interface KnowledgeRetrievalInput {
	domain: KnowledgeDomainId
	intent: IntentId
	question: string
	userId?: string
	payload: Record<string, unknown>
}

export interface KnowledgeProvider {
	readonly domain: KnowledgeDomainId
	retrieve(input: KnowledgeRetrievalInput): Promise<NormalizedKnowledge>
}
