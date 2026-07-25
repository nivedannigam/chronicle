import type { KnowledgeDomain } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { ConnectorDocumentRecord } from '@/core/connectors'
import type {
	AskIntent,
	RetrievedKnowledge,
} from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type { IntentDetectionResult } from '@/features/ask/retrieval/intent-detector'

export interface IntelligenceMemberContext {
	memberId: string | null
	memberName: string | null
	familyMemberNames: string[]
}

export interface IntelligenceQueryInput {
	userId: string
	question: string
	member: IntelligenceMemberContext
	uploadedReports?: UploadedHealthReport[]
	connectorDocuments?: ConnectorDocumentRecord[]
	onStream?: (partialAnswer: string) => void
}

export interface KnowledgeProviderContext {
	userId: string
	question: string
	intent: AskIntent
	resolvedQuestion: string
	member: IntelligenceMemberContext
	categoryId?: string
	metricId?: string
	metricName?: string
	timeRangeYears?: number
	uploadedReports?: UploadedHealthReport[]
	connectorDocuments?: ConnectorDocumentRecord[]
	searchHits?: SemanticSearchHit[]
}

export interface SemanticSearchHit {
	id: string
	domain: KnowledgeDomain
	kind: 'report' | 'metric' | 'timeline' | 'entity'
	title: string
	snippet: string
	score: number
	reportId?: string
	metricName?: string
	date?: string
	reportType?: string
	memberId?: string | null
}

export interface KnowledgeProviderResult {
	domain: KnowledgeDomain
	available: boolean
	knowledge: RetrievedKnowledge | null
	unavailableReason?: string
}

export interface ChronicleKnowledgeProvider {
	readonly domain: KnowledgeDomain
	readonly label: string
	isAvailable(context: KnowledgeProviderContext): boolean
	search?(context: KnowledgeProviderContext): SemanticSearchHit[]
	retrieve(context: KnowledgeProviderContext): KnowledgeProviderResult
}

export interface IntelligencePipelineContext {
	input: IntelligenceQueryInput
	resolvedQuestion: string
	detection: IntentDetectionResult
	member: IntelligenceMemberContext
	searchHits: SemanticSearchHit[]
	mergedKnowledge: RetrievedKnowledge | null
	activeDomains: KnowledgeDomain[]
	dataAvailable: boolean
}

export interface IntelligencePipelineResult {
	context: IntelligencePipelineContext
}

export function createEmptyKnowledge(
	intent: AskIntent,
	domain: KnowledgeDomain = 'health',
): RetrievedKnowledge {
	return {
		domain,
		intent,
		reports: [],
		metrics: [],
		timelines: [],
		trends: [],
		observations: [],
		relationships: [],
		insights: [],
		alerts: [],
		summaryLines: [],
		comparisons: [],
	}
}
