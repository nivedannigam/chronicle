import type {
	ChronicleKnowledgeProvider,
	KnowledgeProviderQuery,
	ProviderContextResult,
} from '@/features/intelligence/contracts/knowledge-provider.contract'
import type {
	KnowledgeContextPackage,
	KnowledgeDocument,
	KnowledgeReference,
	KnowledgeTimelineEvent,
} from '@/features/intelligence/entities/knowledge-entities'
import { fromRetrievedKnowledge } from '@/features/intelligence/adapters/retrieved-knowledge.adapter'
import { registerKnowledgeProvider } from '@/features/intelligence/registry/intelligence-registry'
import {
	mergeSearchHits,
	scoreTextMatch,
	tokenizeQuery,
} from '@/features/intelligence/services/semantic-search.service'
import type { SemanticSearchHit } from '@/features/intelligence/types/intelligence.types'
import { timelineKnowledgeRetriever } from '@/features/knowledge/retrieval/timeline-knowledge-retriever'
import type { RetrievalQuery } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import {
	buildTimelineEvents,
	resolveTimelineYearFilter,
} from '@/features/timeline/engine/timeline-engine'
import '@/features/timeline/providers/register-timeline-providers'
import type {
	ChronicleTimelineEvent,
	TimelineSources,
} from '@/features/timeline/types/timeline.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

const PROVIDER_ID = 'timeline'

function getTimelineSources(query: KnowledgeProviderQuery): TimelineSources {
	const health = query.sources.health as
		{ uploadedReports?: UploadedHealthReport[] } | undefined
	const documents = query.sources.documents as
		| {
				uploadedDocuments?: ChronicleDocument[]
		  }
		| undefined

	return {
		health: {
			uploadedReports: health?.uploadedReports ?? [],
		},
		documents: {
			uploadedDocuments: documents?.uploadedDocuments ?? [],
		},
	}
}

function getTimelineEvents(
	query: KnowledgeProviderQuery,
): ChronicleTimelineEvent[] {
	const yearFilter = resolveTimelineYearFilter(query.resolvedQuestion)

	return buildTimelineEvents({
		userId: query.userId,
		memberId: query.member.memberId,
		memberName: query.member.memberName,
		sources: getTimelineSources(query),
		filters: {
			searchQuery: query.resolvedQuestion,
			memberId: query.member.memberId,
			fromDate: yearFilter.fromDate,
			toDate: yearFilter.toDate,
		},
	}).events
}

function searchTimelineEvents(input: {
	question: string
	events: ChronicleTimelineEvent[]
}): SemanticSearchHit[] {
	const tokens = tokenizeQuery(input.question)
	const hits: SemanticSearchHit[] = []

	for (const event of input.events) {
		const body = [
			event.title,
			event.summary,
			event.tags.join(' '),
			event.eventType,
			event.sourceModule,
		].join(' ')

		const score = scoreTextMatch(tokens, body)

		if (score <= 0) {
			continue
		}

		hits.push({
			id: `timeline-${event.id}`,
			domain: event.sourceModule === 'documents' ? 'documents' : 'health',
			kind: 'timeline',
			title: event.title,
			snippet: event.summary,
			score,
			date: event.timestamp,
			memberId: event.familyMemberId,
		})
	}

	return mergeSearchHits(hits)
}

function toRetrievalQuery(query: KnowledgeProviderQuery): RetrievalQuery {
	const sources = getTimelineSources(query)

	return {
		userId: query.userId,
		question: query.question,
		intent: query.intent,
		resolvedQuestion: query.resolvedQuestion,
		uploadedReports: sources.health?.uploadedReports,
		documents: sources.documents?.uploadedDocuments,
		searchHits: query.searchHits,
		member: query.member,
	}
}

function loadTimelinePackage(
	query: KnowledgeProviderQuery,
): KnowledgeContextPackage {
	const knowledge = timelineKnowledgeRetriever.retrieve(toRetrievalQuery(query))
	return fromRetrievedKnowledge(knowledge, PROVIDER_ID)
}

export class TimelineKnowledgeProvider implements ChronicleKnowledgeProvider {
	readonly id = PROVIDER_ID
	readonly domain = 'health' as const
	readonly label = 'Life Timeline'
	readonly priority = 5

	supports(query: KnowledgeProviderQuery): boolean {
		if (
			query.intent !== 'timeline_query' &&
			query.intent !== 'timeline_search' &&
			query.intent !== 'timeline_last_event'
		) {
			return false
		}

		return (
			buildTimelineEvents({
				userId: query.userId,
				memberId: query.member.memberId,
				memberName: query.member.memberName,
				sources: getTimelineSources(query),
				filters: {
					memberId: query.member.memberId,
				},
			}).totalCount > 0
		)
	}

	search(query: KnowledgeProviderQuery): SemanticSearchHit[] {
		return searchTimelineEvents({
			question: query.resolvedQuestion,
			events: getTimelineEvents(query),
		})
	}

	retrieveContext(query: KnowledgeProviderQuery): ProviderContextResult {
		if (!this.supports(query)) {
			return {
				providerId: this.id,
				domain: this.domain,
				available: false,
				package: null,
				unavailableReason: 'No timeline events match this question yet.',
			}
		}

		return {
			providerId: this.id,
			domain: this.domain,
			available: true,
			package: loadTimelinePackage(query),
		}
	}

	retrieveTimeline(query: KnowledgeProviderQuery): KnowledgeTimelineEvent[] {
		if (!this.supports(query)) {
			return []
		}

		return loadTimelinePackage(query).timelineEvents
	}

	retrieveEntities(query: KnowledgeProviderQuery): KnowledgeDocument[] {
		if (!this.supports(query)) {
			return []
		}

		return loadTimelinePackage(query).documents
	}

	retrieveEvidence(query: KnowledgeProviderQuery): KnowledgeReference[] {
		if (!this.supports(query)) {
			return []
		}

		return loadTimelinePackage(query).references
	}
}

export const timelineKnowledgeProvider = new TimelineKnowledgeProvider()

registerKnowledgeProvider(timelineKnowledgeProvider)
