import type { FinanceKnowledge } from '@/features/finance-knowledge/types/finance-knowledge.types'
import { buildFinanceKnowledge } from '@/features/finance-knowledge'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type {
	ChronicleTimelineProvider,
	TimelineProviderQuery,
} from '@/features/timeline/contracts/timeline-provider.contract'
import { registerTimelineProvider } from '@/features/timeline/registry/timeline-registry'
import type {
	ChronicleTimelineEvent,
	TimelineImportance,
} from '@/features/timeline/types/timeline.types'

const PROVIDER_ID = 'finance'

interface FinanceTimelineSource {
	knowledge?: FinanceKnowledge
	documents?: ChronicleDocument[]
	userId?: string
	hasFolderAssigned?: boolean
	familyMemberId?: string | null
}

function getFinanceKnowledge(
	query: TimelineProviderQuery,
): FinanceKnowledge | null {
	const source = query.sources.finance as FinanceTimelineSource | undefined

	if (source?.knowledge) {
		return source.knowledge
	}

	if (source?.documents && source.userId) {
		return buildFinanceKnowledge({
			userId: source.userId,
			documents: source.documents,
			members: [],
			hasFolderAssigned: source.hasFolderAssigned ?? false,
			selectedMemberId: source.familyMemberId ?? null,
		})
	}

	return null
}

function mapImportance(importance: TimelineImportance): TimelineImportance {
	return importance
}

function toChronicleEvent(
	event: FinanceKnowledge['timeline'][number],
): ChronicleTimelineEvent {
	const primaryDocumentId = event.sourceDocumentIds[0] ?? null

	return {
		id: `finance-${event.id}`,
		timestamp: event.eventDate,
		eventType: 'custom',
		category: 'life',
		title: event.title,
		summary: event.entityDisplayName ?? event.description,
		familyMemberId: event.ownerMemberIds[0] ?? null,
		sourceModule: 'finance',
		relatedAssets: [
			...(event.entityId
				? [
						{
							type: 'document' as const,
							id: event.entityId,
							label: event.entityDisplayName ?? 'Finance account',
						},
					]
				: []),
			...(primaryDocumentId
				? [
						{
							type: 'document' as const,
							id: primaryDocumentId,
							label: event.metadata.sourceDocumentLabel ?? 'Source document',
						},
					]
				: []),
		],
		tags: ['finance', event.eventType],
		importance: mapImportance(event.importance),
		references: event.sourceDocumentIds.map((documentId) => ({
			type: 'document',
			id: documentId,
			label: event.metadata.sourceDocumentLabel ?? 'Source document',
		})),
		metadata: {
			financeEventId: event.id,
			entityId: event.entityId ?? '',
			documentId: primaryDocumentId ?? '',
			eventType: event.eventType,
		},
	}
}

export class FinanceTimelineProvider implements ChronicleTimelineProvider {
	readonly id = PROVIDER_ID
	readonly module = 'finance'
	readonly label = 'Finance'
	readonly priority = 16

	supports(query: TimelineProviderQuery): boolean {
		const knowledge = getFinanceKnowledge(query)
		return Boolean(knowledge && knowledge.timeline.length > 0)
	}

	getEvents(query: TimelineProviderQuery): ChronicleTimelineEvent[] {
		const knowledge = getFinanceKnowledge(query)

		if (!knowledge) {
			return []
		}

		return knowledge.timeline.map(toChronicleEvent)
	}
}

export const financeTimelineProvider = new FinanceTimelineProvider()

registerTimelineProvider(financeTimelineProvider)
