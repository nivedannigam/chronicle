import type {
	VehicleAttentionItem,
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

const FACT_LABELS: Record<string, string> = {
	registration_number: 'Registration number',
	registration_date: 'Registration date',
	insurance_provider: 'Insurance provider',
	policy_number: 'Policy number',
	policy_start: 'Policy start',
	policy_expiry: 'Policy expiry',
	idv: 'IDV',
	premium: 'Premium',
	puc_expiry: 'PUC expiry',
	warranty_expiry: 'Warranty expiry',
	service_date: 'Service date',
	service_mileage: 'Service mileage',
	service_amount: 'Service amount',
	vin: 'VIN',
	engine_number: 'Engine number',
	purchase_date: 'Purchase date',
}

const CATEGORY_LABELS = {
	car: 'Car',
	two_wheeler: 'Two-wheeler',
	other: 'Vehicle',
} as const

function daysUntil(date: string | null): number | null {
	if (!date) return null
	const parsed = Date.parse(date)
	if (Number.isNaN(parsed)) return null
	return Math.ceil((parsed - Date.now()) / (1000 * 60 * 60 * 24))
}

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

function latestFact(
	facts: VehicleFactRecord[],
	vehicleId: string,
	key: string,
): VehicleFactRecord | null {
	return (
		facts
			.filter((fact) => fact.vehicleId === vehicleId && fact.factKey === key)
			.sort((left, right) =>
				(right.valueDate ?? '').localeCompare(left.valueDate ?? ''),
			)[0] ?? null
	)
}

function buildAttention(input: {
	vehicles: VehicleKnowledgeVehicle[]
	documents: VehicleDocumentRecord[]
}): VehicleAttentionItem[] {
	const items: VehicleAttentionItem[] = []

	for (const vehicle of input.vehicles) {
		const insuranceDays = daysUntil(vehicle.insuranceExpiry)
		const pucDays = daysUntil(vehicle.pucExpiry)
		const warrantyDays = daysUntil(vehicle.warrantyExpiry)

		if (insuranceDays != null && insuranceDays < 0) {
			items.push({
				id: `${vehicle.id}-insurance-expired`,
				vehicleId: vehicle.id,
				severity: 'high',
				title: `${vehicle.displayName} insurance expired`,
				body: 'Renew your motor insurance to stay covered.',
				actionLabel: 'View insurance',
			})
		} else if (insuranceDays != null && insuranceDays <= 30) {
			items.push({
				id: `${vehicle.id}-insurance-soon`,
				vehicleId: vehicle.id,
				severity: 'medium',
				title: `${vehicle.displayName} insurance expires soon`,
				body: `Valid until ${formatDateLabel(vehicle.insuranceExpiry)}.`,
				actionLabel: 'View insurance',
			})
		}

		if (pucDays != null && pucDays < 0) {
			items.push({
				id: `${vehicle.id}-puc-expired`,
				vehicleId: vehicle.id,
				severity: 'high',
				title: `${vehicle.displayName} PUC expired`,
				body: 'Renew your pollution certificate.',
				actionLabel: 'View compliance',
			})
		} else if (pucDays != null && pucDays <= 30) {
			items.push({
				id: `${vehicle.id}-puc-soon`,
				vehicleId: vehicle.id,
				severity: 'medium',
				title: `${vehicle.displayName} PUC expires soon`,
				body: `Valid until ${formatDateLabel(vehicle.pucExpiry)}.`,
				actionLabel: 'View compliance',
			})
		}

		if (warrantyDays != null && warrantyDays <= 30 && warrantyDays >= 0) {
			items.push({
				id: `${vehicle.id}-warranty-soon`,
				vehicleId: vehicle.id,
				severity: 'medium',
				title: `${vehicle.displayName} warranty ending soon`,
				body: `Valid until ${formatDateLabel(vehicle.warrantyExpiry)}.`,
				actionLabel: 'View warranty',
			})
		}

		const hasRegistration = input.documents.some(
			(document) =>
				document.vehicleId === vehicle.id &&
				document.documentType === 'registration' &&
				document.status === 'completed',
		)

		if (!hasRegistration && vehicle.documentCount > 0) {
			items.push({
				id: `${vehicle.id}-missing-rc`,
				vehicleId: vehicle.id,
				severity: 'high',
				title: `${vehicle.displayName} registration not found`,
				body: 'We have not found a registration certificate yet.',
				actionLabel: 'View documents',
			})
		}
	}

	return items.sort((left, right) => {
		const rank = { high: 0, medium: 1, low: 2 } as const
		return rank[left.severity] - rank[right.severity]
	})
}

function buildVehicle(
	record: VehicleRecord,
	documents: VehicleDocumentRecord[],
	facts: VehicleFactRecord[],
): VehicleKnowledgeVehicle {
	const vehicleDocuments = documents.filter(
		(document) => document.vehicleId === record.id,
	)
	const insuranceExpiry =
		latestFact(facts, record.id, 'policy_expiry')?.valueDate ??
		vehicleDocuments.find((document) => document.documentType === 'insurance')
			?.expiryDate ??
		null
	const pucExpiry =
		latestFact(facts, record.id, 'puc_expiry')?.valueDate ??
		vehicleDocuments.find(
			(document) =>
				document.documentType === 'compliance' &&
				document.documentSubtype === 'puc',
		)?.expiryDate ??
		null
	const warrantyExpiry =
		latestFact(facts, record.id, 'warranty_expiry')?.valueDate ?? null
	const lastService =
		latestFact(facts, record.id, 'service_date')?.valueDate ??
		vehicleDocuments
			.filter((document) => document.documentType === 'service')
			.sort((left, right) =>
				(right.documentDate ?? '').localeCompare(left.documentDate ?? ''),
			)[0]?.documentDate ??
		null

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
		insuranceExpiry,
		pucExpiry,
		warrantyExpiry,
		lastServiceDate: lastService,
		nextServiceLabel: lastService ? 'Based on your last service record' : null,
		isDisplayReady: vehicleDocuments.some(
			(document) => document.status === 'completed',
		),
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
		}))

	const timeline: VehicleKnowledgeTimelineEvent[] = raw.timeline
		.filter((event) =>
			vehicles.some((vehicle) => vehicle.id === event.vehicleId),
		)
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

	const attention = buildAttention({
		vehicles,
		documents: raw.documents,
	})

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
	}
}
