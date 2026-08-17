import type {
	VehicleKnowledge,
	VehicleKnowledgeDocument,
	VehicleKnowledgeFact,
	VehicleKnowledgeTimelineEvent,
	VehicleKnowledgeVehicle,
} from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import type {
	VehicleDocumentRecord,
	VehicleFactRecord,
	VehicleRecord,
	VehicleTimelineRecord,
} from '@/features/vehicle-knowledge/types/vehicle-record.types'
import type { VehicleKnowledgeRawData } from '@/features/vehicle-knowledge/providers/vehicle-knowledge-data-source'
import { buildVehicleAttention } from '@/features/vehicle-knowledge/engines/vehicle-attention.engine'
import { buildVehicleCompleteness } from '@/features/vehicle-knowledge/engines/vehicle-completeness.engine'
import {
	computeVehicleCurrentState,
	pickLatestExpiryForVehicle,
} from '@/features/vehicle-knowledge/engines/vehicle-state.engine'

const FACT_LABELS: Record<string, string> = {
	registration_number: 'Registration number',
	registration_date: 'Registration date',
	owner: 'Owner',
	make: 'Make',
	model: 'Model',
	variant: 'Variant',
	fuel_type: 'Fuel type',
	color: 'Color',
	insurance_provider: 'Insurance provider',
	policy_number: 'Policy number',
	policy_start: 'Policy start',
	policy_expiry: 'Policy expiry',
	idv: 'IDV',
	premium: 'Premium',
	puc_certificate_number: 'PUC certificate number',
	puc_expiry: 'PUC expiry',
	warranty_provider: 'Warranty provider',
	warranty_expiry: 'Warranty expiry',
	service_date: 'Service date',
	service_mileage: 'Service mileage',
	service_amount: 'Service amount',
	service_center: 'Service center',
	service_type: 'Service type',
	next_service_date: 'Next service date',
	next_service_mileage: 'Next service mileage',
	lender: 'Lender',
	agreement_number: 'Agreement number',
	financed_amount: 'Financed amount',
	monthly_payment: 'Monthly payment',
	tenure: 'Tenure',
	outstanding_amount: 'Outstanding amount',
	vin: 'VIN',
	engine_number: 'Engine number',
	purchase_date: 'Purchase date',
}

const CATEGORY_LABELS = {
	car: 'Car',
	two_wheeler: 'Two-wheeler',
	other: 'Vehicle',
} as const

const UNASSIGNED_SLUG = '_unassigned-documents'

function formatDateLabel(date: string | null): string | null {
	if (!date) return null
	const parsed = Date.parse(date)
	if (Number.isNaN(parsed)) return null
	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function documentNameById(
	documents: VehicleDocumentRecord[],
	documentId: string | null,
): string | null {
	if (!documentId) return null
	return (
		documents.find((document) => document.id === documentId)?.fileName ?? null
	)
}

function buildVehicle(
	record: VehicleRecord,
	documents: VehicleDocumentRecord[],
	facts: VehicleFactRecord[],
): VehicleKnowledgeVehicle {
	const vehicleDocuments = documents.filter(
		(document) => document.vehicleId === record.id,
	)
	const currentState = computeVehicleCurrentState({
		vehicleId: record.id,
		registrationNumber: record.registrationNumber,
		documents,
		facts,
	})
	const completeness = buildVehicleCompleteness({
		vehicleId: record.id,
		documents,
	})
	const latestDates = pickLatestExpiryForVehicle({
		vehicleId: record.id,
		documents,
		facts,
	})
	const nextServiceFact = facts
		.filter(
			(fact) =>
				fact.vehicleId === record.id && fact.factKey === 'next_service_date',
		)
		.sort((left, right) =>
			(right.valueDate ?? '').localeCompare(left.valueDate ?? ''),
		)[0]

	return {
		id: record.id,
		displayName: record.displayName,
		slug: record.slug,
		category: record.category,
		categoryLabel: CATEGORY_LABELS[record.category],
		status: record.status,
		statusLabel: record.status === 'active' ? 'Active' : 'Inactive',
		registrationNumber: record.registrationNumber,
		registrationDate: record.registrationDate,
		purchaseDate: record.purchaseDate,
		fuelType: record.fuelType,
		vin: record.vin,
		engineNumber: record.engineNumber,
		color: record.color,
		make: record.make,
		model: record.model,
		variant: record.variant,
		documentCount: vehicleDocuments.length,
		insuranceExpiry: latestDates.insuranceExpiry,
		pucExpiry: latestDates.pucExpiry,
		warrantyExpiry: latestDates.warrantyExpiry,
		lastServiceDate: latestDates.lastServiceDate,
		nextServiceLabel: nextServiceFact?.valueDate
			? `Next service ${formatDateLabel(nextServiceFact.valueDate)}`
			: latestDates.lastServiceDate
				? 'Based on your last service record'
				: null,
		isDisplayReady: vehicleDocuments.some(
			(document) => document.status === 'completed',
		),
		currentState,
		completeness,
		limitations: completeness.limitations,
	}
}

export function buildVehicleKnowledgeFromRawData(
	raw: VehicleKnowledgeRawData,
	input: {
		userId: string
		familyMemberId: string | null
		accountOwnerMemberId: string | null
	},
): VehicleKnowledge {
	const member =
		raw.familyMembers.find((entry) => entry.id === input.familyMemberId) ??
		raw.familyMembers.find((entry) => entry.isAccountOwner) ??
		null

	const vehicles = raw.vehicles
		.filter((vehicle) => {
			if (vehicle.slug === UNASSIGNED_SLUG) {
				return false
			}

			if (!input.familyMemberId) return true
			if (!vehicle.familyMemberId) {
				return input.familyMemberId === input.accountOwnerMemberId
			}
			return vehicle.familyMemberId === input.familyMemberId
		})
		.map((vehicle) => buildVehicle(vehicle, raw.documents, raw.facts))

	const documents: VehicleKnowledgeDocument[] = raw.documents
		.filter((document) =>
			vehicles.some((vehicle) => vehicle.id === document.vehicleId),
		)
		.map((document) => {
			return {
				id: document.id,
				vehicleId: document.vehicleId,
				fileName: document.fileName,
				documentType: document.documentType,
				documentSubtype: document.documentSubtype,
				status: document.status,
				documentDate: document.documentDate,
				expiryDate: document.expiryDate,
				uploadedAt: document.uploadedAt,
				isDisplayReady: document.status === 'completed',
				sourceLabel: 'Vehicles folder',
			}
		})

	const facts: VehicleKnowledgeFact[] = raw.facts
		.filter((fact) => vehicles.some((vehicle) => vehicle.id === fact.vehicleId))
		.map((fact) => ({
			id: fact.id,
			vehicleId: fact.vehicleId,
			documentId: fact.documentId,
			factKey: fact.factKey,
			label: FACT_LABELS[fact.factKey] ?? fact.factKey.replace(/_/g, ' '),
			displayValue:
				fact.factValue ??
				formatDateLabel(fact.valueDate) ??
				(fact.valueNumber != null ? String(fact.valueNumber) : '—'),
			valueDate: fact.valueDate,
			confidence: fact.confidence,
			sourceDocumentId: fact.documentId,
			sourceDocumentName: documentNameById(raw.documents, fact.documentId),
		}))

	const timeline: VehicleKnowledgeTimelineEvent[] = raw.timeline
		.filter((event) =>
			vehicles.some((vehicle) => vehicle.id === event.vehicleId),
		)
		.sort((left, right) => right.eventDate.localeCompare(left.eventDate))
		.map((event: VehicleTimelineRecord) => ({
			id: event.id,
			vehicleId: event.vehicleId,
			eventType: event.eventType,
			title: event.title,
			description: event.description,
			eventDate: event.eventDate,
			year: Number(event.eventDate.slice(0, 4)),
			evidenceIds: event.evidenceIds,
		}))

	const attention = buildVehicleAttention({
		vehicles: vehicles.map((vehicle) => ({
			id: vehicle.id,
			displayName: vehicle.displayName,
			currentState: vehicle.currentState,
		})),
		documents: raw.documents,
		timeline: raw.timeline,
	})

	const limitations = [
		...new Set(vehicles.flatMap((vehicle) => vehicle.limitations)),
	]

	const headline =
		vehicles.length === 1
			? `${vehicles[0]!.displayName} is ready in Chronicle`
			: vehicles.length > 1
				? `${vehicles.length} vehicles in Chronicle`
				: 'Your vehicles will appear here'

	return {
		userId: input.userId,
		familyMember: {
			id: member?.id ?? input.familyMemberId,
			displayName: member?.displayName ?? 'You',
			relationship: member?.relationship ?? 'self',
			isAccountOwner: member?.isAccountOwner ?? true,
		},
		vehicles,
		documents,
		facts,
		timeline,
		attention,
		summary: {
			headline,
			lines:
				vehicles.length > 0
					? [
							`${documents.length} vehicle document${documents.length === 1 ? '' : 's'}`,
							attention.length > 0
								? `${attention.length} item${attention.length === 1 ? '' : 's'} may need attention`
								: 'Everything looks up to date',
						]
					: ['Connect your Vehicles folder to get started'],
		},
		hasVehicles: vehicles.length > 0,
		documentCount: documents.length,
		limitations,
	}
}
