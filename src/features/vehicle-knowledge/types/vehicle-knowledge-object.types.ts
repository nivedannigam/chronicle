import type {
	VehicleAttentionSeverity,
	VehicleCategoryId,
	VehicleFactKey,
	VehicleStatus,
	VehicleTimelineEventType,
} from '@/features/vehicle-knowledge/types/vehicle-knowledge.types'
import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'
import type { VehicleCurrentState } from '@/features/vehicle-knowledge/engines/vehicle-state.engine'
import type { VehicleCompleteness } from '@/features/vehicle-knowledge/engines/vehicle-completeness.engine'

export interface VehicleKnowledgeFamilyMember {
	id: string | null
	displayName: string
	relationship: string
	isAccountOwner: boolean
}

export interface VehicleKnowledgeDocument {
	id: string
	vehicleId: string
	fileName: string
	documentType: VehicleDocumentTypeId
	documentSubtype: string
	status: string
	documentDate: string | null
	expiryDate: string | null
	uploadedAt: string
	isDisplayReady: boolean
	sourceLabel: string
}

export interface VehicleKnowledgeFact {
	id: string
	vehicleId: string
	documentId: string | null
	factKey: VehicleFactKey | string
	label: string
	displayValue: string
	valueDate: string | null
	confidence: number
	sourceDocumentId: string | null
	sourceDocumentName: string | null
}

export interface VehicleKnowledgeTimelineEvent {
	id: string
	vehicleId: string
	eventType: VehicleTimelineEventType
	title: string
	description: string | null
	eventDate: string
	year: number
	evidenceIds: string[]
}

export interface VehicleAttentionItem {
	id: string
	vehicleId: string
	severity: VehicleAttentionSeverity
	title: string
	body: string
	actionLabel: string | null
}

export interface VehicleKnowledgeVehicle {
	id: string
	displayName: string
	slug: string
	category: VehicleCategoryId
	categoryLabel: string
	status: VehicleStatus
	statusLabel: string
	registrationNumber: string | null
	registrationDate: string | null
	purchaseDate: string | null
	fuelType: string | null
	vin: string | null
	engineNumber: string | null
	color: string | null
	make: string | null
	model: string | null
	variant: string | null
	documentCount: number
	insuranceExpiry: string | null
	pucExpiry: string | null
	warrantyExpiry: string | null
	lastServiceDate: string | null
	nextServiceLabel: string | null
	isDisplayReady: boolean
	currentState: VehicleCurrentState
	completeness: VehicleCompleteness
	limitations: string[]
}

export interface VehicleKnowledgeSummary {
	headline: string
	lines: string[]
}

export interface VehicleKnowledge {
	userId: string
	familyMember: VehicleKnowledgeFamilyMember
	vehicles: VehicleKnowledgeVehicle[]
	documents: VehicleKnowledgeDocument[]
	facts: VehicleKnowledgeFact[]
	timeline: VehicleKnowledgeTimelineEvent[]
	attention: VehicleAttentionItem[]
	summary: VehicleKnowledgeSummary
	hasVehicles: boolean
	documentCount: number
	limitations: string[]
}
