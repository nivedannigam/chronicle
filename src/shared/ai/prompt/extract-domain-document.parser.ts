import type {
	InsuranceDocumentExtraction,
	VehicleDocumentAiExtraction,
} from '@/shared/ai/types/domain-document-extraction.types'
import type { InsurancePolicyType } from '@/features/insurance-knowledge/types/insurance-record.types'
import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'

const POLICY_TYPES = new Set<InsurancePolicyType>([
	'health',
	'life_term',
	'motor',
	'home',
	'travel',
	'other',
])

const VEHICLE_TYPES = new Set<VehicleDocumentTypeId>([
	'registration',
	'insurance',
	'compliance',
	'service',
	'warranty',
	'purchase_finance',
	'other',
])

function readString(value: unknown): string | null {
	return typeof value === 'string' && value.trim() ? value.trim() : null
}

function readNumber(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value
	}

	if (typeof value === 'string') {
		const parsed = Number.parseFloat(value.replace(/,/g, ''))
		return Number.isNaN(parsed) ? null : parsed
	}

	return null
}

function readDate(value: unknown): string | null {
	const raw = readString(value)
	if (!raw) return null
	const parsed = Date.parse(raw)
	return Number.isNaN(parsed) ? null : raw.slice(0, 10)
}

export function parseInsuranceExtractionJson(
	content: string,
): InsuranceDocumentExtraction {
	const parsed = JSON.parse(content) as Record<string, unknown>
	const policyTypeRaw = readString(parsed.policyType)
	const policyType =
		policyTypeRaw && POLICY_TYPES.has(policyTypeRaw as InsurancePolicyType)
			? (policyTypeRaw as InsurancePolicyType)
			: null

	return {
		insurer: readString(parsed.insurer),
		policyNumber: readString(parsed.policyNumber),
		policyType,
		productName: readString(parsed.productName),
		inceptionDate: readDate(parsed.inceptionDate),
		expiryDate: readDate(parsed.expiryDate),
		renewalDate: readDate(parsed.renewalDate),
		sumInsured: readNumber(parsed.sumInsured),
		premium: readNumber(parsed.premium),
		currency: readString(parsed.currency) ?? 'INR',
		insuredMembers: Array.isArray(parsed.insuredMembers)
			? parsed.insuredMembers
					.filter((entry): entry is string => typeof entry === 'string')
					.map((entry) => entry.trim())
					.filter(Boolean)
			: [],
		documentKind: readString(parsed.documentKind),
		confidence: readNumber(parsed.confidence) ?? 0.7,
		rawFields: parsed as Record<string, string | number | null>,
	}
}

export function parseVehicleExtractionJson(
	content: string,
): VehicleDocumentAiExtraction {
	const parsed = JSON.parse(content) as Record<string, unknown>
	const documentTypeRaw = readString(parsed.documentType)
	const documentType =
		documentTypeRaw &&
		VEHICLE_TYPES.has(documentTypeRaw as VehicleDocumentTypeId)
			? (documentTypeRaw as VehicleDocumentTypeId)
			: null

	const facts = Array.isArray(parsed.facts)
		? parsed.facts
				.filter(
					(entry): entry is Record<string, unknown> =>
						typeof entry === 'object' && entry != null,
				)
				.map((entry) => ({
					factKey: readString(entry.factKey) ?? 'unknown',
					factValue: readString(entry.factValue),
					valueDate: readDate(entry.valueDate),
					valueNumber: readNumber(entry.valueNumber),
				}))
				.filter((entry) => entry.factKey !== 'unknown')
		: []

	return {
		documentType,
		documentSubtype: readString(parsed.documentSubtype),
		registrationNumber: readString(parsed.registrationNumber),
		vin: readString(parsed.vin),
		engineNumber: readString(parsed.engineNumber),
		make: readString(parsed.make),
		model: readString(parsed.model),
		variant: readString(parsed.variant),
		documentDate: readDate(parsed.documentDate),
		expiryDate: readDate(parsed.expiryDate),
		provider: readString(parsed.provider),
		facts,
		confidence: readNumber(parsed.confidence) ?? 0.7,
		rawFields: parsed as Record<string, string | number | null>,
	}
}
