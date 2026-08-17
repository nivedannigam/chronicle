import { extractDocumentMetadata } from '@/features/documents/extraction/document-metadata.engine'
import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'
import {
	extractFieldValues,
	VEHICLE_FIELD_DEFINITIONS,
} from '@/features/vehicle-knowledge/extraction/vehicle-field-definitions'
import type { VehicleFactKey } from '@/features/vehicle-knowledge/types/vehicle-knowledge.types'
import { classifyVehicleDocument } from '@/features/vehicle-knowledge/utils/vehicle-document-classifier'
import {
	parseAmount,
	parseDateFromSearchableText,
	parseIndianRegistration,
	parseMileage,
} from '@/features/vehicle-knowledge/utils/vehicle-normalization.utils'

export interface VehicleExtractedFact {
	factKey: VehicleFactKey | string
	factValue: string | null
	valueDate?: string | null
	valueNumber?: number | null
	rawValue?: string | null
	confidence: number
}

export interface VehicleDocumentExtraction {
	classification: ReturnType<typeof classifyVehicleDocument>
	documentType: VehicleDocumentTypeId
	documentSubtype: string
	documentDate: string | null
	expiryDate: string | null
	effectiveDate: string | null
	provider: string | null
	identifiers: {
		registrationNumber: string | null
		vin: string | null
		engineNumber: string | null
	}
	make: string | null
	model: string | null
	variant: string | null
	facts: VehicleExtractedFact[]
	extractionMethod: 'metadata' | 'content' | 'deterministic'
	confidence: number
	rawFields: Record<string, string>
}

function inferDocumentDate(input: {
	documentType: VehicleDocumentTypeId
	fields: Record<string, string>
	searchable: string
}): string | null {
	const candidates = [
		input.fields.registration_date,
		input.fields.policy_start,
		input.fields.service_date,
		input.fields.purchase_date,
		parseDateFromSearchableText(input.searchable),
	]

	for (const candidate of candidates) {
		if (candidate) {
			return candidate
		}
	}

	if (input.documentType === 'insurance') {
		return input.fields.policy_start ?? null
	}

	return null
}

function inferExpiryDate(input: {
	documentType: VehicleDocumentTypeId
	documentSubtype: string
	fields: Record<string, string>
	searchable: string
	metadataExpiry: string | null
}): string | null {
	if (input.fields.policy_expiry) {
		return input.fields.policy_expiry
	}

	if (input.fields.puc_expiry) {
		return input.fields.puc_expiry
	}

	if (input.fields.warranty_expiry) {
		return input.fields.warranty_expiry
	}

	if (input.metadataExpiry) {
		return input.metadataExpiry
	}

	if (/(expiry|expires|valid\s*until|valid\s*till)/i.test(input.searchable)) {
		return parseDateFromSearchableText(input.searchable)
	}

	return null
}

function buildFactsFromFields(
	fields: Record<string, string>,
): VehicleExtractedFact[] {
	const facts: VehicleExtractedFact[] = []

	for (const definition of VEHICLE_FIELD_DEFINITIONS) {
		const raw = fields[definition.id]

		if (!raw) {
			continue
		}

		let valueDate: string | null = null
		let valueNumber: number | null = null
		let factValue: string | null = raw

		if (definition.valueDate) {
			valueDate = raw
			factValue = raw
		} else if (definition.valueNumber) {
			const parsed = Number.parseFloat(raw.replace(/,/g, ''))
			valueNumber = Number.isNaN(parsed) ? null : parsed
			factValue = valueNumber != null ? String(valueNumber) : raw
		}

		facts.push({
			factKey: definition.factKey,
			factValue,
			valueDate,
			valueNumber,
			rawValue: raw,
			confidence: 0.72,
		})
	}

	return facts
}

function enrichFactsFromHeuristics(input: {
	searchable: string
	documentType: VehicleDocumentTypeId
	documentSubtype: string
	facts: VehicleExtractedFact[]
}): VehicleExtractedFact[] {
	const facts = [...input.facts]
	const hasKey = (key: string) => facts.some((fact) => fact.factKey === key)

	const registration = parseIndianRegistration(input.searchable)

	if (registration && !hasKey('registration_number')) {
		facts.push({
			factKey: 'registration_number',
			factValue: registration,
			confidence: 0.6,
		})
	}

	const amount = parseAmount(input.searchable)

	if (amount && !hasKey('premium') && input.documentType === 'insurance') {
		facts.push({
			factKey: 'premium',
			factValue: String(amount.amount),
			valueNumber: amount.amount,
			rawValue: amount.rawValue,
			confidence: 0.55,
		})
	}

	if (amount && !hasKey('service_amount') && input.documentType === 'service') {
		facts.push({
			factKey: 'service_amount',
			factValue: String(amount.amount),
			valueNumber: amount.amount,
			rawValue: amount.rawValue,
			confidence: 0.55,
		})
	}

	const mileage = parseMileage(input.searchable)

	if (
		mileage &&
		!hasKey('service_mileage') &&
		input.documentType === 'service'
	) {
		facts.push({
			factKey: 'service_mileage',
			factValue: `${mileage.value} ${mileage.unit}`,
			valueNumber: mileage.value,
			rawValue: mileage.rawValue,
			confidence: 0.55,
		})
	}

	return facts
}

export function extractVehicleDocument(input: {
	fileName: string
	folderPath?: string | null
	text?: string | null
}): VehicleDocumentExtraction {
	const classification = classifyVehicleDocument({
		fileName: input.fileName,
		folderPath: input.folderPath,
	})
	const searchable = `${input.fileName}\n${input.folderPath ?? ''}\n${input.text ?? ''}`
	const metadata = extractDocumentMetadata({
		fileName: input.fileName,
		text: input.text,
	})
	const rawFields = extractFieldValues({
		text: searchable,
		documentType: classification.documentType,
		documentSubtype: classification.documentSubtype,
	})
	const facts = enrichFactsFromHeuristics({
		searchable,
		documentType: classification.documentType,
		documentSubtype: classification.documentSubtype,
		facts: buildFactsFromFields(rawFields),
	})
	const documentDate = inferDocumentDate({
		documentType: classification.documentType,
		fields: rawFields,
		searchable,
	})
	const expiryDate = inferExpiryDate({
		documentType: classification.documentType,
		documentSubtype: classification.documentSubtype,
		fields: rawFields,
		searchable,
		metadataExpiry: metadata.expiryDate,
	})
	const extractionMethod = input.text?.trim() ? 'content' : 'metadata'
	const populatedCount = Object.keys(rawFields).length
	const confidence = Math.min(
		0.95,
		Math.max(classification.confidence, metadata.confidence) +
			populatedCount * 0.04,
	)

	return {
		classification,
		documentType: classification.documentType,
		documentSubtype: classification.documentSubtype,
		documentDate,
		expiryDate,
		effectiveDate: rawFields.policy_start ?? documentDate,
		provider:
			rawFields.insurance_provider ??
			rawFields.warranty_provider ??
			rawFields.lender ??
			metadata.issuer,
		identifiers: {
			registrationNumber:
				rawFields.registration_number ?? parseIndianRegistration(searchable),
			vin: rawFields.vin ?? null,
			engineNumber: rawFields.engine_number ?? null,
		},
		make: rawFields.make ?? null,
		model: rawFields.model ?? null,
		variant: rawFields.variant ?? null,
		facts,
		extractionMethod,
		confidence,
		rawFields,
	}
}

export function timelineEventForExtraction(input: {
	documentType: VehicleDocumentTypeId
	documentSubtype: string
	documentDate: string | null
	expiryDate: string | null
}): {
	eventType: string
	title: string
	description: string | null
	eventDate: string
} | null {
	switch (input.documentType) {
		case 'purchase_finance':
			if (!input.documentDate) return null
			return {
				eventType: 'vehicle_purchased',
				title: 'Vehicle purchased',
				description: null,
				eventDate: input.documentDate,
			}
		case 'registration':
			if (!input.documentDate) return null
			return {
				eventType: 'registration_issued',
				title: 'Registration recorded',
				description: null,
				eventDate: input.documentDate,
			}
		case 'insurance':
			if (/renew/i.test(input.documentSubtype) && input.documentDate) {
				return {
					eventType: 'insurance_renewed',
					title: 'Insurance renewed',
					description: null,
					eventDate: input.documentDate,
				}
			}

			if (input.documentDate) {
				return {
					eventType: 'insurance_started',
					title: 'Insurance started',
					description: null,
					eventDate: input.documentDate,
				}
			}

			if (input.expiryDate) {
				return {
					eventType: 'insurance_renewed',
					title: 'Insurance renewed',
					description: null,
					eventDate: input.expiryDate,
				}
			}

			return null
		case 'compliance':
			if (input.documentSubtype === 'puc' && input.documentDate) {
				return {
					eventType: 'puc_renewed',
					title: 'PUC renewed',
					description: null,
					eventDate: input.documentDate,
				}
			}

			if (input.documentSubtype === 'puc' && input.expiryDate) {
				return {
					eventType: 'puc_renewed',
					title: 'PUC renewed',
					description: null,
					eventDate: input.documentDate ?? input.expiryDate,
				}
			}

			return null
		case 'service':
			if (!input.documentDate) return null
			return {
				eventType: 'service_completed',
				title: 'Vehicle serviced',
				description: null,
				eventDate: input.documentDate,
			}
		case 'warranty':
			if (!input.documentDate && !input.expiryDate) return null
			return {
				eventType: 'warranty_started',
				title: 'Warranty recorded',
				description: null,
				eventDate: input.documentDate ?? input.expiryDate!,
			}
		default:
			return null
	}
}
