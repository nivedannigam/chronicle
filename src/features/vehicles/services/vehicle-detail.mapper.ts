import type {
	VehicleKnowledge,
	VehicleKnowledgeDocument,
	VehicleKnowledgeTimelineEvent,
} from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import { getVehicleDocumentTypeMeta } from '@/features/vehicle-knowledge/graph/vehicle-document-types'

export interface VehicleDocumentViewModel {
	id: string
	title: string
	typeLabel: string
	dateLabel: string | null
	expiryLabel: string | null
	sourceLabel: string
	statusLabel: string
}

export interface VehicleDetailViewModel {
	id: string
	slug: string
	displayName: string
	statusLabel: string
	categoryLabel: string
	registrationNumber: string | null
	registrationDate: string | null
	purchaseDate: string | null
	fuelType: string | null
	insuranceExpiry: string | null
	pucExpiry: string | null
	warrantyExpiry: string | null
	lastServiceDate: string | null
	documents: VehicleDocumentViewModel[]
	timeline: VehicleKnowledgeTimelineEvent[]
	attentionCount: number
}

function formatDate(date: string | null): string | null {
	if (!date) return null
	const parsed = Date.parse(date)
	if (Number.isNaN(parsed)) return null
	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function mapDocument(
	document: VehicleKnowledgeDocument,
): VehicleDocumentViewModel {
	const meta = getVehicleDocumentTypeMeta(document.documentType)

	return {
		id: document.id,
		title: document.fileName,
		typeLabel: meta.label,
		dateLabel: formatDate(document.documentDate),
		expiryLabel: formatDate(document.expiryDate),
		sourceLabel: document.sourceLabel,
		statusLabel: document.isDisplayReady ? 'Ready' : 'Still organizing',
	}
}

export function buildVehicleDetailViewModel(input: {
	knowledge: VehicleKnowledge
	vehicleId: string
}): VehicleDetailViewModel | null {
	const vehicle = input.knowledge.vehicles.find(
		(entry) => entry.id === input.vehicleId || entry.slug === input.vehicleId,
	)

	if (!vehicle) {
		return null
	}

	const documents = input.knowledge.documents
		.filter((document) => document.vehicleId === vehicle.id)
		.map(mapDocument)
	const timeline = input.knowledge.timeline.filter(
		(event) => event.vehicleId === vehicle.id,
	)

	return {
		id: vehicle.id,
		slug: vehicle.slug,
		displayName: vehicle.displayName,
		statusLabel: vehicle.statusLabel,
		categoryLabel: vehicle.categoryLabel,
		registrationNumber: vehicle.registrationNumber,
		registrationDate: formatDate(vehicle.registrationDate),
		purchaseDate: formatDate(vehicle.purchaseDate),
		fuelType: vehicle.fuelType,
		insuranceExpiry: formatDate(vehicle.insuranceExpiry),
		pucExpiry: formatDate(vehicle.pucExpiry),
		warrantyExpiry: formatDate(vehicle.warrantyExpiry),
		lastServiceDate: formatDate(vehicle.lastServiceDate),
		documents,
		timeline,
		attentionCount: input.knowledge.attention.filter(
			(item) => item.vehicleId === vehicle.id,
		).length,
	}
}
