import {
	formatRegistrationNumber,
	normalizeEngineNumber,
	normalizeRegistrationNumber,
	normalizeVin,
	parseFlexibleDate,
} from '@/features/vehicle-knowledge/utils/vehicle-normalization.utils'

export interface VehicleFieldDefinition {
	id: string
	factKey: string
	label: string
	patterns: RegExp[]
	normalize?: (value: string) => string
	valueDate?: boolean
	valueNumber?: boolean
}

function normalizeDateValue(value: string): string {
	return parseFlexibleDate(value) ?? value.trim()
}

export const VEHICLE_FIELD_DEFINITIONS: VehicleFieldDefinition[] = [
	{
		id: 'registration_number',
		factKey: 'registration_number',
		label: 'Registration number',
		patterns: [
			/(?:reg(?:istration)?\.?\s*(?:no|number|#)?[:\s]*)([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{1,4})/i,
			/(?:vehicle\s*(?:no|number|#)?[:\s]*)([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{1,4})/i,
		],
		normalize: formatRegistrationNumber,
	},
	{
		id: 'vin',
		factKey: 'vin',
		label: 'VIN',
		patterns: [
			/(?:vin|chassis\s*(?:no|number|#)?)[:\s]*([A-HJ-NPR-Z0-9]{11,17})/i,
		],
		normalize: normalizeVin,
	},
	{
		id: 'engine_number',
		factKey: 'engine_number',
		label: 'Engine number',
		patterns: [/(?:engine\s*(?:no|number|#)?)[:\s]*([A-Z0-9]{5,20})/i],
		normalize: normalizeEngineNumber,
	},
	{
		id: 'registration_date',
		factKey: 'registration_date',
		label: 'Registration date',
		patterns: [
			/(?:reg(?:istration)?\.?\s*date[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
		],
		normalize: normalizeDateValue,
		valueDate: true,
	},
	{
		id: 'owner',
		factKey: 'owner',
		label: 'Owner',
		patterns: [
			/(?:owner(?:\s*name)?[:\s]*)([A-Za-z\s.]{3,80})/i,
			/(?:registered\s*owner[:\s]*)([A-Za-z\s.]{3,80})/i,
		],
	},
	{
		id: 'make',
		factKey: 'make',
		label: 'Make',
		patterns: [/(?:make[:\s]*)([A-Za-z0-9\s.-]{2,40})/i],
	},
	{
		id: 'model',
		factKey: 'model',
		label: 'Model',
		patterns: [/(?:model[:\s]*)([A-Za-z0-9\s.-]{2,40})/i],
	},
	{
		id: 'variant',
		factKey: 'variant',
		label: 'Variant',
		patterns: [/(?:variant[:\s]*)([A-Za-z0-9\s.-]{2,40})/i],
	},
	{
		id: 'fuel_type',
		factKey: 'fuel_type',
		label: 'Fuel type',
		patterns: [
			/(?:fuel\s*(?:type)?[:\s]*)(petrol|diesel|cng|lpg|electric|ev|hybrid)/i,
		],
		normalize: (value) => value.trim().toLowerCase(),
	},
	{
		id: 'color',
		factKey: 'color',
		label: 'Color',
		patterns: [/(?:colou?r[:\s]*)([A-Za-z\s]{3,30})/i],
	},
	{
		id: 'insurance_provider',
		factKey: 'insurance_provider',
		label: 'Insurance provider',
		patterns: [
			/(?:insurer|insurance\s*(?:company|provider))[:\s]*([A-Za-z0-9\s&.-]{3,60})/i,
		],
	},
	{
		id: 'policy_number',
		factKey: 'policy_number',
		label: 'Policy number',
		patterns: [/(?:policy\s*(?:no|number|#)?[:\s]*)([A-Z0-9/-]{4,24})/i],
	},
	{
		id: 'policy_start',
		factKey: 'policy_start',
		label: 'Policy start',
		patterns: [
			/(?:policy\s*(?:start|from|commencement)[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
			/(?:period\s*from[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
		],
		normalize: normalizeDateValue,
		valueDate: true,
	},
	{
		id: 'policy_expiry',
		factKey: 'policy_expiry',
		label: 'Policy expiry',
		patterns: [
			/(?:policy\s*(?:expiry|valid\s*(?:till|until|upto)))[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
			/(?:valid\s*(?:till|until|upto|up to)[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
			/(?:expir(?:y|es|ation)\s*(?:on|date)?[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
		],
		normalize: normalizeDateValue,
		valueDate: true,
	},
	{
		id: 'idv',
		factKey: 'idv',
		label: 'IDV',
		patterns: [
			/(?:idv|insured\s*declared\s*value)[:\s]*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
		],
		valueNumber: true,
	},
	{
		id: 'premium',
		factKey: 'premium',
		label: 'Premium',
		patterns: [
			/(?:premium|total\s*premium)[:\s]*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
		],
		valueNumber: true,
	},
	{
		id: 'puc_certificate_number',
		factKey: 'puc_certificate_number',
		label: 'PUC certificate number',
		patterns: [
			/(?:certificate\s*(?:no|number|#)?[:\s]*)([A-Z0-9/-]{4,24})/i,
			/(?:puc\s*(?:no|number|#)?[:\s]*)([A-Z0-9/-]{4,24})/i,
		],
	},
	{
		id: 'puc_expiry',
		factKey: 'puc_expiry',
		label: 'PUC expiry',
		patterns: [
			/(?:puc\s*(?:valid\s*(?:till|until|upto)|expiry))[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
		],
		normalize: normalizeDateValue,
		valueDate: true,
	},
	{
		id: 'service_date',
		factKey: 'service_date',
		label: 'Service date',
		patterns: [
			/(?:service\s*date[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
			/(?:date\s*of\s*service[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
		],
		normalize: normalizeDateValue,
		valueDate: true,
	},
	{
		id: 'service_mileage',
		factKey: 'service_mileage',
		label: 'Service mileage',
		patterns: [
			/(?:odometer|mileage|km\s*reading)[:\s]*([\d,]+)\s*(km|kms|mi|miles)?/i,
		],
		valueNumber: true,
	},
	{
		id: 'service_amount',
		factKey: 'service_amount',
		label: 'Service amount',
		patterns: [
			/(?:total\s*(?:amount|bill|invoice))[:\s]*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
		],
		valueNumber: true,
	},
	{
		id: 'service_center',
		factKey: 'service_center',
		label: 'Service center',
		patterns: [
			/(?:service\s*center|workshop|dealer)[:\s]*([A-Za-z0-9\s&.,-]{3,80})/i,
		],
	},
	{
		id: 'next_service_date',
		factKey: 'next_service_date',
		label: 'Next service date',
		patterns: [
			/(?:next\s*service\s*(?:due|date)?[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
		],
		normalize: normalizeDateValue,
		valueDate: true,
	},
	{
		id: 'warranty_expiry',
		factKey: 'warranty_expiry',
		label: 'Warranty expiry',
		patterns: [
			/(?:warranty\s*(?:valid\s*(?:till|until|upto)|expiry))[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
		],
		normalize: normalizeDateValue,
		valueDate: true,
	},
	{
		id: 'warranty_provider',
		factKey: 'warranty_provider',
		label: 'Warranty provider',
		patterns: [
			/(?:warranty\s*(?:provider|by))[:\s]*([A-Za-z0-9\s&.,-]{3,60})/i,
		],
	},
	{
		id: 'purchase_date',
		factKey: 'purchase_date',
		label: 'Purchase date',
		patterns: [
			/(?:purchase\s*date[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
			/(?:date\s*of\s*(?:purchase|delivery)[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
		],
		normalize: normalizeDateValue,
		valueDate: true,
	},
	{
		id: 'lender',
		factKey: 'lender',
		label: 'Lender',
		patterns: [
			/(?:lender|lessor|financ(?:ier|e\s*company))[:\s]*([A-Za-z0-9\s&.,-]{3,60})/i,
		],
	},
	{
		id: 'agreement_number',
		factKey: 'agreement_number',
		label: 'Agreement number',
		patterns: [
			/(?:agreement\s*(?:no|number|#)?[:\s]*)([A-Z0-9/-]{4,24})/i,
			/(?:loan\s*(?:no|number|#)?[:\s]*)([A-Z0-9/-]{4,24})/i,
		],
	},
	{
		id: 'financed_amount',
		factKey: 'financed_amount',
		label: 'Financed amount',
		patterns: [
			/(?:loan\s*amount|financed\s*amount)[:\s]*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
		],
		valueNumber: true,
	},
	{
		id: 'monthly_payment',
		factKey: 'monthly_payment',
		label: 'Monthly payment',
		patterns: [
			/(?:monthly\s*(?:payment|emi))[:\s]*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
		],
		valueNumber: true,
	},
]

const TYPE_FIELD_HINTS: Record<
	string,
	Array<(typeof VEHICLE_FIELD_DEFINITIONS)[number]['id']>
> = {
	registration: [
		'registration_number',
		'registration_date',
		'owner',
		'make',
		'model',
		'variant',
		'fuel_type',
		'color',
		'vin',
		'engine_number',
	],
	insurance: [
		'registration_number',
		'insurance_provider',
		'policy_number',
		'policy_start',
		'policy_expiry',
		'idv',
		'premium',
	],
	compliance_puc: [
		'registration_number',
		'puc_certificate_number',
		'puc_expiry',
	],
	service: [
		'registration_number',
		'service_date',
		'service_mileage',
		'service_amount',
		'service_center',
		'next_service_date',
	],
	warranty: ['registration_number', 'warranty_provider', 'warranty_expiry'],
	purchase_finance: [
		'purchase_date',
		'lender',
		'agreement_number',
		'financed_amount',
		'monthly_payment',
		'registration_number',
	],
}

export function getFieldDefinitionsForDocument(input: {
	documentType: string
	documentSubtype: string
}): VehicleFieldDefinition[] {
	const subtypeKey =
		input.documentType === 'compliance' && input.documentSubtype === 'puc'
			? 'compliance_puc'
			: input.documentType
	const preferredIds =
		TYPE_FIELD_HINTS[subtypeKey] ??
		TYPE_FIELD_HINTS[input.documentType] ??
		VEHICLE_FIELD_DEFINITIONS.map((field) => field.id)

	const preferred = new Set(preferredIds)

	return [
		...VEHICLE_FIELD_DEFINITIONS.filter((field) => preferred.has(field.id)),
		...VEHICLE_FIELD_DEFINITIONS.filter((field) => !preferred.has(field.id)),
	]
}

export function extractFieldValues(input: {
	text: string
	documentType: string
	documentSubtype: string
}): Record<string, string> {
	const fields: Record<string, string> = {}
	const definitions = getFieldDefinitionsForDocument(input)

	for (const definition of definitions) {
		for (const pattern of definition.patterns) {
			const match = input.text.match(pattern)

			if (match?.[1]) {
				const raw = match[1].trim()
				fields[definition.id] = definition.normalize?.(raw) ?? raw
				break
			}
		}
	}

	return fields
}

export { normalizeRegistrationNumber, normalizeVin, normalizeEngineNumber }
