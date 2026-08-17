import type {
	VehicleKnowledge,
	VehicleKnowledgeFact,
	VehicleKnowledgeVehicle,
} from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
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
): VehicleKnowledgeVehicle | null {
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

function latestFactForVehicle(
	facts: VehicleKnowledgeFact[],
	vehicleId: string,
	factKey: string,
): VehicleKnowledgeFact | null {
	return (
		facts
			.filter(
				(fact) => fact.vehicleId === vehicleId && fact.factKey === factKey,
			)
			.sort((left, right) =>
				(right.valueDate ?? right.displayValue).localeCompare(
					left.valueDate ?? left.displayValue,
				),
			)[0] ?? null
	)
}

function buildStatusOverview(
	knowledge: VehicleKnowledge,
	vehicle: VehicleKnowledgeVehicle | null,
): EvidenceBundle {
	const lines = vehicle
		? [
				vehicle.registrationNumber
					? `Registration: ${vehicle.registrationNumber}`
					: 'Registration: not found yet',
				vehicle.currentState.insurance.label,
				vehicle.currentState.puc.label,
				vehicle.currentState.warranty.label,
				vehicle.currentState.service.label,
				`${vehicle.documentCount} document${vehicle.documentCount === 1 ? '' : 's'}`,
			]
		: ['No vehicles found yet']

	const attentionLines = vehicle
		? knowledge.attention
				.filter((item) => item.vehicleId === vehicle.id)
				.slice(0, 3)
				.map((item) => item.title)
		: []

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
			lines: [...lines, ...attentionLines],
			healthScore: null,
			limitations: vehicle
				? vehicle.limitations
				: ['Connect your Vehicles folder to begin'],
		},
		metadata: {
			questionType: 'STATUS_OVERVIEW',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function resolveFactKey(question: string): string | null {
	const normalized = question.toLowerCase()

	if (normalized.includes('registration')) return 'registration_number'
	if (normalized.includes('vin') || normalized.includes('chassis')) return 'vin'
	if (normalized.includes('engine')) return 'engine_number'
	if (normalized.includes('insurance') && normalized.includes('expir')) {
		return 'policy_expiry'
	}
	if (normalized.includes('puc')) return 'puc_expiry'
	if (normalized.includes('warranty')) return 'warranty_expiry'
	if (normalized.includes('service')) return 'service_date'
	if (normalized.includes('policy number')) return 'policy_number'
	if (
		normalized.includes('insurer') ||
		normalized.includes('insurance provider')
	) {
		return 'insurance_provider'
	}

	return null
}

function buildFactLookup(
	knowledge: VehicleKnowledge,
	request: EvidenceRequest,
): EvidenceBundle {
	const vehicle = resolveVehicleScope(knowledge, request)
	const factKey = resolveFactKey(request.question)
	const facts = knowledge.facts.filter((fact) => {
		if (vehicle && fact.vehicleId !== vehicle.id) return false
		if (!factKey) return true
		return fact.factKey === factKey
	})
	const latest =
		factKey && vehicle
			? latestFactForVehicle(knowledge.facts, vehicle.id, factKey)
			: (facts[0] ?? null)

	const lines =
		latest != null
			? [
					`${latest.label}: ${latest.displayValue}`,
					latest.sourceDocumentName
						? `Source: ${latest.sourceDocumentName}`
						: 'Source document not linked yet',
				]
			: facts.slice(0, 5).map((fact) => {
					const source = fact.sourceDocumentName
						? ` (${fact.sourceDocumentName})`
						: ''
					return `${fact.label}: ${fact.displayValue}${source}`
				})

	return {
		reports: [],
		metrics: (latest ? [latest] : facts.slice(0, 5)).map((fact) => ({
			id: fact.id,
			canonicalId: fact.factKey,
			displayName: fact.label,
			value: fact.displayValue,
			unit: null,
			status: 'known',
			referenceRange: fact.sourceDocumentName ?? '',
			observedAt: fact.valueDate ?? '',
			reportId: fact.sourceDocumentId ?? '',
			reportTitle: fact.sourceDocumentName ?? fact.label,
		})),
		trends: [],
		timeline: [],
		summary: {
			headline: vehicle ? `${vehicle.displayName}` : 'Vehicle facts',
			lines,
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

function buildLatestArtifact(
	knowledge: VehicleKnowledge,
	request: EvidenceRequest,
): EvidenceBundle {
	const vehicle = resolveVehicleScope(knowledge, request)
	const question = request.question.toLowerCase()
	const documentType = question.includes('insurance')
		? 'insurance'
		: question.includes('puc')
			? 'compliance'
			: question.includes('service')
				? 'service'
				: question.includes('registration') || question.includes('rc')
					? 'registration'
					: null

	const documents = knowledge.documents
		.filter((document) => {
			if (vehicle && document.vehicleId !== vehicle.id) return false
			if (!documentType) return true
			if (documentType === 'compliance') {
				return (
					document.documentType === 'compliance' &&
					document.documentSubtype === 'puc'
				)
			}
			return document.documentType === documentType
		})
		.sort((left, right) =>
			(right.documentDate ?? right.uploadedAt).localeCompare(
				left.documentDate ?? left.uploadedAt,
			),
		)

	const latest = documents[0] ?? null

	return {
		reports: latest
			? [
					{
						id: latest.id,
						title: latest.fileName,
						date: latest.documentDate ?? latest.uploadedAt,
						lab: vehicle?.displayName ?? 'Vehicle',
						metricCount: 0,
						reportType: latest.documentType,
					},
				]
			: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: latest
				? `Latest ${latest.documentType} document`
				: 'No matching documents found',
			lines: latest
				? [
						latest.fileName,
						latest.expiryDate
							? `Valid until ${formatDate(latest.expiryDate)}`
							: latest.documentDate
								? `Dated ${formatDate(latest.documentDate)}`
								: 'Date not extracted yet',
					]
				: ['We have not found a matching vehicle document yet.'],
			healthScore: null,
			limitations: [],
		},
		metadata: {
			questionType: 'LATEST_REPORT',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildInventory(
	knowledge: VehicleKnowledge,
	request: EvidenceRequest,
): EvidenceBundle {
	const vehicle = resolveVehicleScope(knowledge, request)
	const documents = knowledge.documents.filter((document) =>
		vehicle ? document.vehicleId === vehicle.id : true,
	)

	return {
		reports: documents.map((document) => ({
			id: document.id,
			title: document.fileName,
			date: document.documentDate ?? document.uploadedAt,
			lab: vehicle?.displayName ?? 'Vehicle',
			metricCount: 0,
			reportType: document.documentType,
		})),
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: vehicle
				? `${vehicle.displayName} documents`
				: 'Vehicle document inventory',
			lines: vehicle
				? vehicle.completeness.items.map(
						(item) => `${item.available ? '✓' : '–'} ${item.label}`,
					)
				: [`${documents.length} documents found`],
			healthScore: null,
			limitations: vehicle?.limitations ?? [],
		},
		metadata: {
			questionType: 'STATUS_OVERVIEW',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildTrend(
	knowledge: VehicleKnowledge,
	request: EvidenceRequest,
): EvidenceBundle {
	const vehicle = resolveVehicleScope(knowledge, request)
	const serviceFacts = knowledge.facts
		.filter(
			(fact) =>
				(!vehicle || fact.vehicleId === vehicle.id) &&
				(fact.factKey === 'service_date' ||
					fact.factKey === 'service_mileage' ||
					fact.factKey === 'service_amount'),
		)
		.sort((left, right) =>
			(right.valueDate ?? '').localeCompare(left.valueDate ?? ''),
		)

	const serviceEvents = knowledge.timeline
		.filter(
			(event) =>
				event.eventType === 'service_completed' &&
				(!vehicle || event.vehicleId === vehicle.id),
		)
		.sort((left, right) => right.eventDate.localeCompare(left.eventDate))

	return {
		reports: [],
		metrics: serviceFacts.slice(0, 8).map((fact) => ({
			id: fact.id,
			canonicalId: fact.factKey,
			displayName: fact.label,
			value: fact.displayValue,
			unit: null,
			status: 'known',
			referenceRange: fact.sourceDocumentName ?? '',
			observedAt: fact.valueDate ?? '',
			reportId: fact.sourceDocumentId ?? '',
			reportTitle: fact.sourceDocumentName ?? fact.label,
		})),
		trends:
			serviceEvents.length > 0
				? [
						{
							metricId: 'service_date',
							displayName: 'Service visits',
							direction: 'stable',
							changePercent: null,
							dataPointCount: serviceEvents.length,
							isActionable: false,
						},
					]
				: [],
		timeline: serviceEvents.map((event) => ({
			id: event.id,
			type: event.eventType,
			title: event.title,
			description: event.description ?? '',
			date: event.eventDate,
		})),
		summary: {
			headline: vehicle
				? `${vehicle.displayName} service history`
				: 'Vehicle service trend',
			lines:
				serviceEvents.length > 0
					? serviceEvents
							.slice(0, 5)
							.map((event) => `${formatDate(event.eventDate)} · ${event.title}`)
					: ['No service history found yet.'],
			healthScore: null,
			limitations: [],
		},
		metadata: {
			questionType: 'TREND',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function isInventoryQuestion(question: string): boolean {
	return /what vehicle documents|documents do i have|document inventory/i.test(
		question,
	)
}

export function resolveVehicleEvidence(input: {
	knowledge: VehicleKnowledge
	request: EvidenceRequest
}): EvidenceBundle {
	const vehicle = resolveVehicleScope(input.knowledge, input.request)

	if (isInventoryQuestion(input.request.question)) {
		return buildInventory(input.knowledge, input.request)
	}

	switch (input.request.questionType) {
		case 'STATUS_OVERVIEW':
		case 'EXPLAIN':
			return buildStatusOverview(input.knowledge, vehicle)
		case 'FACT_LOOKUP':
			return buildFactLookup(input.knowledge, input.request)
		case 'LATEST_REPORT':
			return buildLatestArtifact(input.knowledge, input.request)
		case 'TREND':
			return buildTrend(input.knowledge, input.request)
		default:
			return buildStatusOverview(input.knowledge, vehicle)
	}
}

export function supportsVehicleEvidenceQuestion(
	questionType: QuestionType,
): boolean {
	return [
		'STATUS_OVERVIEW',
		'FACT_LOOKUP',
		'LATEST_REPORT',
		'TREND',
		'EXPLAIN',
	].includes(questionType)
}
