import type { IdentityKnowledge } from '@/features/identity-knowledge/types/identity-knowledge.types'
import { buildIdentityKnowledge } from '@/features/identity-knowledge'
import type {
	ChronicleTimelineProvider,
	TimelineProviderQuery,
} from '@/features/timeline/contracts/timeline-provider.contract'
import { registerTimelineProvider } from '@/features/timeline/registry/timeline-registry'
import type { ChronicleTimelineEvent } from '@/features/timeline/types/timeline.types'

const PROVIDER_ID = 'identity'

interface IdentityTimelineSource {
	knowledge?: IdentityKnowledge
	documents?: import('@/features/documents/types/document.types').ChronicleDocument[]
	userId?: string
	accountOwnerMemberId?: string | null
	familyMemberId?: string | null
}

function getIdentityKnowledge(
	query: TimelineProviderQuery,
): IdentityKnowledge | null {
	const source = query.sources.identity as IdentityTimelineSource | undefined

	if (source?.knowledge) {
		return source.knowledge
	}

	if (source?.documents && source.userId) {
		return buildIdentityKnowledge({
			userId: source.userId,
			documents: source.documents,
			members: [],
			accountOwnerMemberId: source.accountOwnerMemberId ?? null,
		})
	}

	return null
}

function toChronicleEvent(
	event: IdentityKnowledge['timelineEvents'][number],
	knowledge: IdentityKnowledge,
): ChronicleTimelineEvent {
	const document = knowledge.documents.find(
		(entry) => entry.id === event.documentId,
	)

	return {
		id: `identity-${event.id}`,
		timestamp: event.timestamp,
		eventType: 'document_issued',
		category: 'life',
		title: event.title,
		summary: document
			? `${document.typeLabel} · ${document.ownerName}`
			: event.title,
		familyMemberId: document?.ownerMemberId ?? null,
		sourceModule: 'identity',
		relatedAssets: [
			{
				type: 'document',
				id: document?.chronicleDocumentId ?? event.documentId,
				label: document?.typeLabel ?? 'Identity document',
			},
		],
		tags: ['identity', event.eventType],
		importance: event.eventType === 'expiry' ? 'high' : 'medium',
		references: [
			{
				type: 'document',
				id: document?.chronicleDocumentId ?? event.documentId,
				label: document?.typeLabel ?? 'Identity document',
			},
		],
		metadata: {
			identityEventId: event.id,
			documentId: document?.chronicleDocumentId ?? event.documentId,
			eventType: event.eventType,
		},
	}
}

export class IdentityTimelineProvider implements ChronicleTimelineProvider {
	readonly id = PROVIDER_ID
	readonly module = 'identity'
	readonly label = 'Identity'
	readonly priority = 12

	supports(query: TimelineProviderQuery): boolean {
		const knowledge = getIdentityKnowledge(query)
		return Boolean(knowledge && knowledge.timelineEvents.length > 0)
	}

	getEvents(query: TimelineProviderQuery): ChronicleTimelineEvent[] {
		const knowledge = getIdentityKnowledge(query)

		if (!knowledge) {
			return []
		}

		return knowledge.timelineEvents.map((event) =>
			toChronicleEvent(event, knowledge),
		)
	}
}

export const identityTimelineProvider = new IdentityTimelineProvider()

registerTimelineProvider(identityTimelineProvider)
