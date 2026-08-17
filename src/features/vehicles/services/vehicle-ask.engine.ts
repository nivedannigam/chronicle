import type {
	AskConversationTurn,
	EvidenceCitation,
} from '@/features/ask/types'
import type { TrustResponse } from '@/features/ask/trust/trust.types'
import { conversationMemory } from '@/features/ask/memory/conversation-memory'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import type { VehicleKnowledgeVehicle } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'

type VehicleAskIntent =
	| 'status_overview'
	| 'registration_lookup'
	| 'insurance_expiry'
	| 'compliance_expiry'
	| 'service_history'
	| 'document_inventory'
	| 'general'

function normalizeQuestion(question: string): string {
	return question.trim().toLowerCase()
}

function classifyVehicleAskIntent(question: string): VehicleAskIntent {
	const q = normalizeQuestion(question)

	if (/how (is|are)|status|overview|doing|summary/i.test(q)) {
		return 'status_overview'
	}

	if (/registration|reg number|number plate|rc number/i.test(q)) {
		return 'registration_lookup'
	}

	if (/insurance.*expir|when.*insurance|policy expir/i.test(q)) {
		return 'insurance_expiry'
	}

	if (/puc|pollution|compliance expir/i.test(q)) {
		return 'compliance_expiry'
	}

	if (/service|serviced|maintenance|last service/i.test(q)) {
		return 'service_history'
	}

	if (/documents|what do i have|papers|records/i.test(q)) {
		return 'document_inventory'
	}

	return 'general'
}

function resolveVehicleFromQuestion(
	knowledge: VehicleKnowledge,
	question: string,
): VehicleKnowledgeVehicle | null {
	const q = normalizeQuestion(question)

	return (
		knowledge.vehicles.find((vehicle) =>
			q.includes(vehicle.displayName.toLowerCase()),
		) ??
		knowledge.vehicles.find((vehicle) =>
			vehicle.registrationNumber
				? q.includes(vehicle.registrationNumber.toLowerCase())
				: false,
		) ??
		knowledge.vehicles[0] ??
		null
	)
}

function formatDate(date: string | null): string {
	if (!date) return 'not found yet'

	const parsed = Date.parse(date)
	if (Number.isNaN(parsed)) return date

	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function buildEvidenceCitations(
	knowledge: VehicleKnowledge,
	vehicle: VehicleKnowledgeVehicle | null,
): EvidenceCitation[] {
	if (!vehicle) {
		return []
	}

	const documents = knowledge.documents
		.filter((document) => document.vehicleId === vehicle.id)
		.slice(0, 3)

	return documents.map((document) => ({
		reportId: document.id,
		reportTitle: document.fileName,
		hospital: vehicle.displayName,
		date: document.documentDate ?? document.uploadedAt,
		source: 'vehicles',
	}))
}

function buildTrustResponse(input: {
	answer: string
	evidenceLabels: string[]
	followUps: string[]
	confidence: number
	dataAvailable: boolean
	citations: EvidenceCitation[]
}): TrustResponse {
	return {
		directAnswer: input.answer,
		evidence: input.evidenceLabels,
		supportingReports: input.citations.map((citation) => ({
			id: citation.reportId,
			title: citation.reportTitle,
			date: citation.date,
		})),
		timelineSummary: [],
		confidence: {
			level:
				input.confidence >= 0.75
					? 'high'
					: input.confidence >= 0.5
						? 'medium'
						: 'low',
			score: input.confidence,
			factors: input.dataAvailable
				? ['Based on your vehicle documents on record.']
				: ['Limited vehicle data available.'],
		},
		missingInformation: input.dataAvailable
			? []
			: ['Connect your Vehicles folder to unlock personalized answers.'],
		disagreements: [],
		followUpQuestions: input.followUps,
		evidenceItems: input.citations.map((citation, index) => ({
			id: `evidence-${index}`,
			reportId: citation.reportId,
			reportTitle: citation.reportTitle,
			reportDate: citation.date,
			hospital: citation.hospital,
			claimKind: 'known_fact' as const,
			source: 'vehicles' as const,
		})),
		explainabilityPrompts: [
			'Which documents did you use?',
			'What needs attention?',
		],
	}
}

function defaultFollowUps(intent: VehicleAskIntent): string[] {
	switch (intent) {
		case 'insurance_expiry':
			return ['When does my PUC expire?', 'Show my service history.']
		case 'compliance_expiry':
			return ['When does insurance expire?', 'What documents do I have?']
		case 'service_history':
			return ['When was my last service?', 'How is my vehicle doing?']
		case 'document_inventory':
			return ['What is my registration number?', 'When does insurance expire?']
		default:
			return [
				'What is my registration number?',
				'When does insurance expire?',
				'What vehicle documents do I have?',
			]
	}
}

function answerStatusOverview(
	knowledge: VehicleKnowledge,
	vehicle: VehicleKnowledgeVehicle | null,
): { answer: string; followUps: string[] } {
	if (!vehicle) {
		return {
			answer: knowledge.hasVehicles
				? knowledge.summary.headline
				: "I don't see any vehicles in your archive yet. Connect your Vehicles folder to get started.",
			followUps: defaultFollowUps('status_overview'),
		}
	}

	const lines = [
		`Based on your records, ${vehicle.displayName} is ${vehicle.statusLabel.toLowerCase()}.`,
		vehicle.registrationNumber
			? `Registration: ${vehicle.registrationNumber}.`
			: 'Registration number not extracted yet.',
		vehicle.currentState.insurance.label,
		vehicle.currentState.puc.label,
		vehicle.currentState.service.label,
	]

	const attention = knowledge.attention
		.filter((item) => item.vehicleId === vehicle.id)
		.slice(0, 2)
		.map((item) => item.title)

	if (attention.length > 0) {
		lines.push(`Needs attention: ${attention.join('; ')}.`)
	}

	return {
		answer: lines.join('\n\n'),
		followUps: defaultFollowUps('status_overview'),
	}
}

function answerRegistrationLookup(vehicle: VehicleKnowledgeVehicle | null): {
	answer: string
	followUps: string[]
} {
	if (!vehicle) {
		return {
			answer: "I couldn't find a vehicle to check in your archive.",
			followUps: defaultFollowUps('registration_lookup'),
		}
	}

	return {
		answer: vehicle.registrationNumber
			? `Based on your records, ${vehicle.displayName} is registered as ${vehicle.registrationNumber}.`
			: `Based on your records, I haven't extracted a registration number for ${vehicle.displayName} yet.`,
		followUps: ['When does insurance expire?', 'What documents do I have?'],
	}
}

function answerInsuranceExpiry(vehicle: VehicleKnowledgeVehicle | null): {
	answer: string
	followUps: string[]
} {
	if (!vehicle) {
		return {
			answer: "I couldn't find a vehicle to check in your archive.",
			followUps: defaultFollowUps('insurance_expiry'),
		}
	}

	return {
		answer: vehicle.insuranceExpiry
			? `Based on your records, ${vehicle.displayName} insurance expires on ${formatDate(vehicle.insuranceExpiry)}.`
			: `Based on your records, I haven't found an insurance expiry date for ${vehicle.displayName} yet.`,
		followUps: ['When does my PUC expire?', 'Show my service history.'],
	}
}

function answerComplianceExpiry(vehicle: VehicleKnowledgeVehicle | null): {
	answer: string
	followUps: string[]
} {
	if (!vehicle) {
		return {
			answer: "I couldn't find a vehicle to check in your archive.",
			followUps: defaultFollowUps('compliance_expiry'),
		}
	}

	return {
		answer: vehicle.pucExpiry
			? `Based on your records, ${vehicle.displayName} PUC expires on ${formatDate(vehicle.pucExpiry)}.`
			: `Based on your records, I haven't found a PUC expiry date for ${vehicle.displayName} yet.`,
		followUps: ['When does insurance expire?', 'What documents do I have?'],
	}
}

function answerServiceHistory(
	knowledge: VehicleKnowledge,
	vehicle: VehicleKnowledgeVehicle | null,
): { answer: string; followUps: string[] } {
	if (!vehicle) {
		return {
			answer: "I couldn't find a vehicle to check in your archive.",
			followUps: defaultFollowUps('service_history'),
		}
	}

	const events = knowledge.timeline
		.filter(
			(event) =>
				event.vehicleId === vehicle.id &&
				event.eventType === 'service_completed',
		)
		.sort((left, right) => right.eventDate.localeCompare(left.eventDate))

	if (events.length === 0) {
		return {
			answer: vehicle.lastServiceDate
				? `Based on your records, ${vehicle.displayName} was last serviced on ${formatDate(vehicle.lastServiceDate)}.`
				: `Based on your records, I haven't found service history for ${vehicle.displayName} yet.`,
			followUps: defaultFollowUps('service_history'),
		}
	}

	return {
		answer: `Based on your records, ${vehicle.displayName} has ${events.length} service record${events.length === 1 ? '' : 's'}. The most recent was ${formatDate(events[0]!.eventDate)} — ${events[0]!.title}.`,
		followUps: defaultFollowUps('service_history'),
	}
}

function answerDocumentInventory(
	knowledge: VehicleKnowledge,
	vehicle: VehicleKnowledgeVehicle | null,
): { answer: string; followUps: string[] } {
	if (!vehicle) {
		return {
			answer: knowledge.hasVehicles
				? `Based on your records, you have ${knowledge.documentCount} vehicle document${knowledge.documentCount === 1 ? '' : 's'} across ${knowledge.vehicles.length} vehicle${knowledge.vehicles.length === 1 ? '' : 's'}.`
				: "I don't see any vehicle documents yet.",
			followUps: defaultFollowUps('document_inventory'),
		}
	}

	const documents = knowledge.documents.filter(
		(document) => document.vehicleId === vehicle.id,
	)
	const checklist = vehicle.completeness.items
		.map((item) => `${item.available ? '✓' : '–'} ${item.label}`)
		.join('\n')

	return {
		answer: [
			`Based on your records, ${vehicle.displayName} has ${documents.length} document${documents.length === 1 ? '' : 's'} on file.`,
			checklist,
		].join('\n\n'),
		followUps: defaultFollowUps('document_inventory'),
	}
}

export function buildVehicleAskTurn(input: {
	knowledge: VehicleKnowledge
	question: string
	memberId: string | null
	memberName: string | null
	sessionKey: string
	onStream?: (partial: string) => void
}): AskConversationTurn {
	const intent = classifyVehicleAskIntent(input.question)
	const vehicle = resolveVehicleFromQuestion(input.knowledge, input.question)

	let result: { answer: string; followUps: string[] }

	switch (intent) {
		case 'registration_lookup':
			result = answerRegistrationLookup(vehicle)
			break
		case 'insurance_expiry':
			result = answerInsuranceExpiry(vehicle)
			break
		case 'compliance_expiry':
			result = answerComplianceExpiry(vehicle)
			break
		case 'service_history':
			result = answerServiceHistory(input.knowledge, vehicle)
			break
		case 'document_inventory':
			result = answerDocumentInventory(input.knowledge, vehicle)
			break
		case 'status_overview':
		case 'general':
		default:
			result = answerStatusOverview(input.knowledge, vehicle)
			break
	}

	const citations = buildEvidenceCitations(input.knowledge, vehicle)
	const evidenceLabels = citations.map((citation) => citation.reportTitle)
	const dataAvailable = input.knowledge.hasVehicles
	const confidence = dataAvailable
		? Math.min(0.9, 0.5 + citations.length * 0.1)
		: 0.25

	if (input.onStream) {
		input.onStream(result.answer)
	}

	const timestamp = new Date().toISOString()
	const trust = buildTrustResponse({
		answer: result.answer,
		evidenceLabels,
		followUps: result.followUps,
		confidence,
		dataAvailable,
		citations,
	})

	const turn: AskConversationTurn = {
		id: crypto.randomUUID(),
		question: input.question,
		answer: result.answer,
		cards: [],
		relatedReports: citations.map((citation) => ({
			id: citation.reportId,
			title: citation.reportTitle,
			date: citation.date,
		})),
		relatedMetrics: [],
		citations,
		evidence: evidenceLabels,
		followUpQuestions: result.followUps,
		memberId: input.memberId,
		memberName: input.memberName,
		domains: ['vehicles'],
		dataAvailable,
		confidence,
		confidenceLevel: trust.confidence.level,
		trust,
		timestamp,
		displayTimestamp: new Date(timestamp).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
		}),
	}

	conversationMemory.addTurn(input.sessionKey, turn, {
		intent,
	})

	return turn
}

export const VEHICLE_ASK_SUGGESTIONS = [
	'How is my vehicle doing?',
	'What is my registration number?',
	'When does insurance expire?',
	'When does my PUC expire?',
	'Show my service history.',
	'What vehicle documents do I have?',
] as const
