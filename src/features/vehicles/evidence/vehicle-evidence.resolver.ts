import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import type {
	EvidenceBundle,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'

const RESOLVER_ID = 'vehicles.evidence_resolver.v1'

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

function resolveVehicleScope(
	knowledge: VehicleKnowledge,
	request: EvidenceRequest,
) {
	const question = request.question.toLowerCase()

	return (
		knowledge.vehicles.find((vehicle) =>
			question.includes(vehicle.displayName.toLowerCase()),
		) ??
		knowledge.vehicles.find((vehicle) =>
			vehicle.registrationNumber
				? question.includes(vehicle.registrationNumber.toLowerCase())
				: false,
		) ??
		knowledge.vehicles[0] ??
		null
	)
}

function buildStatusOverview(
	knowledge: VehicleKnowledge,
	vehicleId: string | null,
): EvidenceBundle {
	const vehicle = vehicleId
		? knowledge.vehicles.find((entry) => entry.id === vehicleId)
		: knowledge.vehicles[0]

	const lines = vehicle
		? [
				vehicle.registrationNumber
					? `Registration: ${vehicle.registrationNumber}`
					: 'Registration: not found yet',
				vehicle.insuranceExpiry
					? `Insurance valid until ${formatDate(vehicle.insuranceExpiry)}`
					: 'Insurance expiry: not found yet',
				vehicle.pucExpiry
					? `PUC valid until ${formatDate(vehicle.pucExpiry)}`
					: 'PUC expiry: not found yet',
				vehicle.lastServiceDate
					? `Last service ${formatDate(vehicle.lastServiceDate)}`
					: 'Service history: not found yet',
				`${vehicle.documentCount} document${vehicle.documentCount === 1 ? '' : 's'}`,
			]
		: ['No vehicles found yet']

	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: knowledge.timeline
			.filter((event) => !vehicle || event.vehicleId === vehicle.id)
			.slice(0, 5)
			.map((event) => ({
				id: event.id,
				type: event.eventType,
				title: event.title,
				description: event.description ?? '',
				date: event.eventDate,
			})),
		summary: {
			headline: vehicle
				? `${vehicle.displayName} status`
				: knowledge.summary.headline,
			lines,
			healthScore: null,
			limitations: vehicle ? [] : ['Connect your Vehicles folder to begin'],
		},
		metadata: {
			questionType: 'STATUS_OVERVIEW',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildFactLookup(
	knowledge: VehicleKnowledge,
	request: EvidenceRequest,
): EvidenceBundle {
	const vehicle = resolveVehicleScope(knowledge, request)
	const question = request.question.toLowerCase()
	const factKeys = [
		'policy_expiry',
		'puc_expiry',
		'registration_number',
		'service_date',
		'purchase_date',
		'warranty_expiry',
	] as const

	const matchedKey = factKeys.find((key) =>
		question.includes(key.replace(/_/g, ' ')),
	)

	const facts = knowledge.facts.filter((fact) => {
		if (vehicle && fact.vehicleId !== vehicle.id) return false
		if (!matchedKey) return true
		return (
			fact.factKey === matchedKey || question.includes(fact.label.toLowerCase())
		)
	})

	return {
		reports: [],
		metrics: facts.slice(0, 5).map((fact) => ({
			id: fact.id,
			canonicalId: fact.factKey,
			displayName: fact.label,
			value: fact.displayValue,
			unit: null,
			status: 'known',
			referenceRange: '',
			observedAt: fact.valueDate ?? '',
			reportId: fact.sourceDocumentId ?? '',
			reportTitle: fact.label,
		})),
		trends: [],
		timeline: [],
		summary: {
			headline: vehicle ? `${vehicle.displayName}` : 'Vehicle facts',
			lines: facts
				.slice(0, 5)
				.map((fact) => `${fact.label}: ${fact.displayValue}`),
			healthScore: null,
			limitations:
				facts.length === 0 ? ['We have not found this information yet.'] : [],
		},
		metadata: {
			questionType: 'FACT_LOOKUP',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

export function resolveVehicleEvidence(input: {
	knowledge: VehicleKnowledge
	request: EvidenceRequest
}): EvidenceBundle {
	const vehicle = resolveVehicleScope(input.knowledge, input.request)

	switch (input.request.questionType) {
		case 'STATUS_OVERVIEW':
		case 'EXPLAIN':
			return buildStatusOverview(input.knowledge, vehicle?.id ?? null)
		case 'FACT_LOOKUP':
		case 'LATEST_REPORT':
			return buildFactLookup(input.knowledge, input.request)
		default:
			return buildStatusOverview(input.knowledge, vehicle?.id ?? null)
	}
}

export function supportsVehicleEvidenceQuestion(
	questionType: QuestionType,
): boolean {
	return [
		'STATUS_OVERVIEW',
		'FACT_LOOKUP',
		'LATEST_REPORT',
		'EXPLAIN',
	].includes(questionType)
}
