import type { PropertyKnowledge } from '@/features/property-knowledge/types/property-knowledge.types'
import { buildPropertyKnowledge } from '@/features/property-knowledge'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type {
	ChronicleTimelineProvider,
	TimelineProviderQuery,
} from '@/features/timeline/contracts/timeline-provider.contract'
import { registerTimelineProvider } from '@/features/timeline/registry/timeline-registry'
import type { ChronicleTimelineEvent } from '@/features/timeline/types/timeline.types'

const PROVIDER_ID = 'property'

interface PropertyTimelineSource {
	knowledge?: PropertyKnowledge
	documents?: ChronicleDocument[]
	userId?: string
	hasFolderAssigned?: boolean
	rootFolderPath?: string | null
	familyMemberId?: string | null
}

function getPropertyKnowledge(
	query: TimelineProviderQuery,
): PropertyKnowledge | null {
	const source = query.sources.property as PropertyTimelineSource | undefined

	if (source?.knowledge) {
		return source.knowledge
	}

	if (source?.documents && source.userId) {
		return buildPropertyKnowledge({
			userId: source.userId,
			documents: source.documents,
			members: [],
			hasFolderAssigned: source.hasFolderAssigned ?? false,
			rootFolderPath: source.rootFolderPath ?? null,
			selectedMemberId: source.familyMemberId ?? null,
		})
	}

	return null
}

function toChronicleEvent(
	event: PropertyKnowledge['timeline'][number],
	knowledge: PropertyKnowledge,
): ChronicleTimelineEvent {
	const property = knowledge.properties.find(
		(entry) => entry.id === event.propertyId,
	)
	const primaryDocumentId = event.documentId ?? event.evidenceIds[0] ?? null

	return {
		id: `property-${event.id}`,
		timestamp: event.eventDate,
		eventType: 'property_registered',
		category: 'life',
		title: event.title,
		summary: property?.displayName ?? 'Property',
		familyMemberId: property?.ownerMemberIds[0] ?? null,
		sourceModule: 'property',
		relatedAssets: [
			...(property
				? [
						{
							type: 'document' as const,
							id: property.slug,
							label: property.displayName,
						},
					]
				: []),
			...(primaryDocumentId
				? [
						{
							type: 'document' as const,
							id: primaryDocumentId,
							label: 'Source document',
						},
					]
				: []),
		],
		tags: ['property', event.eventType],
		importance: 'medium',
		references: event.evidenceIds.map((documentId) => ({
			type: 'document',
			id: documentId,
			label: 'Source document',
		})),
		metadata: {
			propertyEventId: event.id,
			propertyId: event.propertyId,
			documentId: primaryDocumentId ?? '',
			eventType: event.eventType,
		},
	}
}

export class PropertyTimelineProvider implements ChronicleTimelineProvider {
	readonly id = PROVIDER_ID
	readonly module = 'property'
	readonly label = 'Property'
	readonly priority = 15

	supports(query: TimelineProviderQuery): boolean {
		const knowledge = getPropertyKnowledge(query)
		return Boolean(knowledge && knowledge.timeline.length > 0)
	}

	getEvents(query: TimelineProviderQuery): ChronicleTimelineEvent[] {
		const knowledge = getPropertyKnowledge(query)

		if (!knowledge) {
			return []
		}

		return knowledge.timeline.map((event) => toChronicleEvent(event, knowledge))
	}
}

export const propertyTimelineProvider = new PropertyTimelineProvider()

registerTimelineProvider(propertyTimelineProvider)
