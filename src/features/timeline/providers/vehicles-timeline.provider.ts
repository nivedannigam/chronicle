import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import { vehicleKnowledgeProvider } from '@/features/vehicle-knowledge'
import type {
	ChronicleTimelineProvider,
	TimelineProviderQuery,
} from '@/features/timeline/contracts/timeline-provider.contract'
import { registerTimelineProvider } from '@/features/timeline/registry/timeline-registry'
import type {
	ChronicleTimelineEvent,
	TimelineImportance,
} from '@/features/timeline/types/timeline.types'

const PROVIDER_ID = 'vehicles'

interface VehicleTimelineSource {
	knowledge?: VehicleKnowledge
	userId?: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
}

function getVehicleKnowledge(
	query: TimelineProviderQuery,
): VehicleKnowledge | null {
	const source = query.sources.vehicles as VehicleTimelineSource | undefined

	if (source?.knowledge) {
		return source.knowledge
	}

	return null
}

function mapImportance(eventType: string): TimelineImportance {
	switch (eventType) {
		case 'insurance_renewed':
		case 'puc_renewed':
		case 'service_completed':
		case 'vehicle_purchased':
		case 'registration_issued':
			return 'high'
		case 'insurance_started':
		case 'warranty_started':
		case 'document_added':
			return 'medium'
		default:
			return 'low'
	}
}

function resolveVehicleName(
	knowledge: VehicleKnowledge,
	vehicleId: string,
): string {
	return (
		knowledge.vehicles.find((vehicle) => vehicle.id === vehicleId)
			?.displayName ?? 'Vehicle'
	)
}

function toChronicleEvent(
	event: VehicleKnowledge['timeline'][number],
	knowledge: VehicleKnowledge,
): ChronicleTimelineEvent {
	const vehicleName = resolveVehicleName(knowledge, event.vehicleId)
	const primaryDocumentId = event.evidenceIds[0] ?? null

	return {
		id: `vehicles-${event.id}`,
		timestamp: event.eventDate,
		eventType: 'custom',
		category: 'life',
		title: event.title,
		summary: event.description ?? vehicleName,
		familyMemberId: null,
		sourceModule: 'vehicles',
		relatedAssets: [
			{
				type: 'document',
				id: event.vehicleId,
				label: vehicleName,
			},
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
		tags: ['vehicles', event.eventType],
		importance: mapImportance(event.eventType),
		references: event.evidenceIds.map((documentId) => ({
			type: 'document',
			id: documentId,
			label: 'Vehicle document',
		})),
		metadata: {
			vehicleEventId: event.id,
			vehicleId: event.vehicleId,
			documentId: primaryDocumentId ?? '',
			eventType: event.eventType,
		},
	}
}

export class VehiclesTimelineProvider implements ChronicleTimelineProvider {
	readonly id = PROVIDER_ID
	readonly module = 'vehicles'
	readonly label = 'Vehicles'
	readonly priority = 15

	supports(query: TimelineProviderQuery): boolean {
		const knowledge = getVehicleKnowledge(query)
		return Boolean(knowledge && knowledge.timeline.length > 0)
	}

	getEvents(query: TimelineProviderQuery): ChronicleTimelineEvent[] {
		const knowledge = getVehicleKnowledge(query)

		if (!knowledge) {
			return []
		}

		return knowledge.timeline.map((event) => toChronicleEvent(event, knowledge))
	}
}

export const vehiclesTimelineProvider = new VehiclesTimelineProvider()

registerTimelineProvider(vehiclesTimelineProvider)

export async function resolveVehicleKnowledgeForTimeline(input: {
	userId: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
}): Promise<VehicleKnowledge> {
	return vehicleKnowledgeProvider.getKnowledge({
		userId: input.userId,
		familyMemberId: input.familyMemberId ?? null,
		accountOwnerMemberId: input.accountOwnerMemberId ?? null,
	})
}
