import {
	buildTimelineEvents,
	resolveTimelineYearFilter,
} from '@/features/timeline/engine/timeline-engine'
import '@/features/timeline/providers/register-timeline-providers'
import type { ChronicleTimelineEvent } from '@/features/timeline/types/timeline.types'
import type {
	KnowledgeRetriever,
	RetrievalQuery,
	RetrievedKnowledge,
	RetrievedReport,
} from '@/features/knowledge/retrieval/knowledge-retriever.types'

function formatDate(value: string): string {
	return new Date(value).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function toRetrievedReport(event: ChronicleTimelineEvent): RetrievedReport {
	return {
		id: event.id,
		title: event.title,
		date: event.timestamp,
		lab: event.sourceModule,
		category: event.eventType,
		summary: event.summary,
	}
}

function buildSummaryLines(input: {
	events: ChronicleTimelineEvent[]
	intent: RetrievalQuery['intent']
	memberName?: string | null
}): string[] {
	const prefix = input.memberName ? `${input.memberName}'s ` : 'Your '

	if (input.events.length === 0) {
		return [`${prefix}timeline has no matching events yet.`]
	}

	switch (input.intent) {
		case 'timeline_last_event': {
			const latest = input.events[0]!
			return [
				`${prefix}most recent related event was ${latest.title} on ${formatDate(latest.timestamp)}.`,
				latest.summary,
			]
		}
		case 'timeline_query':
			return [
				`Found ${input.events.length} life event${input.events.length === 1 ? '' : 's'} across Chronicle.`,
				...input.events
					.slice(0, 5)
					.map(
						(event) =>
							`${formatDate(event.timestamp)} — ${event.title}: ${event.summary}`,
					),
			]
		default:
			return input.events
				.slice(0, 5)
				.map((event) => `${formatDate(event.timestamp)} — ${event.title}`)
	}
}

export class TimelineKnowledgeRetriever implements KnowledgeRetriever {
	readonly domain = 'health' as const

	retrieve(query: RetrievalQuery): RetrievedKnowledge {
		const yearFilter = resolveTimelineYearFilter(query.resolvedQuestion)
		const timeline = buildTimelineEvents({
			userId: query.userId,
			memberId: query.member?.memberId,
			memberName: query.member?.memberName,
			sources: {
				health: {
					uploadedReports: query.uploadedReports ?? [],
				},
				documents: {
					uploadedDocuments: query.documents ?? [],
				},
			},
			filters: {
				searchQuery: query.resolvedQuestion,
				memberId: query.member?.memberId,
				fromDate: yearFilter.fromDate,
				toDate: yearFilter.toDate,
			},
		})

		let events = timeline.events

		if (query.intent === 'timeline_last_event') {
			const healthEvents = events.filter(
				(event) => event.sourceModule === 'health',
			)
			events = (healthEvents.length > 0 ? healthEvents : events).slice(0, 1)
		}

		const reports = events.map(toRetrievedReport)
		const insights = events
			.slice(0, 6)
			.map((event) => `${event.title} — ${formatDate(event.timestamp)}`)

		return {
			domain: 'health',
			intent: query.intent,
			reports,
			metrics: [],
			timelines: [],
			trends: [],
			observations: [],
			relationships: [],
			insights,
			alerts: events
				.filter((event) => event.importance === 'high')
				.map((event) => event.summary),
			summaryLines: buildSummaryLines({
				events,
				intent: query.intent,
				memberName: query.member?.memberName,
			}),
			comparisons: [],
		}
	}
}

export const timelineKnowledgeRetriever = new TimelineKnowledgeRetriever()
