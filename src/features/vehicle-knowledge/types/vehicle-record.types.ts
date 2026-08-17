import type {
	VehicleCategoryId,
	VehicleFactKey,
	VehicleStatus,
	VehicleTimelineEventType,
} from '@/features/vehicle-knowledge/types/vehicle-knowledge.types'
import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'

export interface VehicleRecord {
	id: string
	userId: string
	familyMemberId: string | null
	displayName: string
	slug: string
	category: VehicleCategoryId
	make: string | null
	model: string | null
	variant: string | null
	registrationNumber: string | null
	registrationDate: string | null
	purchaseDate: string | null
	fuelType: string | null
	vin: string | null
	engineNumber: string | null
	color: string | null
	status: VehicleStatus
	source: string
	createdAt: string
	updatedAt: string
}

export interface VehicleDocumentRecord {
	id: string
	userId: string
	vehicleId: string
	familyMemberId: string | null
	registryId: string | null
	fileName: string
	documentType: VehicleDocumentTypeId
	documentSubtype: string
	status: string
	documentDate: string | null
	expiryDate: string | null
	storagePath: string | null
	uploadedAt: string
	processedAt: string | null
}

export interface VehicleFactRecord {
	id: string
	userId: string
	vehicleId: string
	documentId: string | null
	factKey: VehicleFactKey | string
	factValue: string | null
	valueDate: string | null
	valueNumber: number | null
	confidence: number
	source: string
}

export interface VehicleTimelineRecord {
	id: string
	userId: string
	vehicleId: string
	documentId: string | null
	eventType: VehicleTimelineEventType
	title: string
	description: string | null
	eventDate: string
	evidenceIds: string[]
}
