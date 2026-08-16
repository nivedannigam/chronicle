export type VehicleDocumentTypeId =
	| 'registration'
	| 'insurance'
	| 'compliance'
	| 'service'
	| 'warranty'
	| 'purchase_finance'
	| 'other'

export interface VehicleDocumentTypeMeta {
	id: VehicleDocumentTypeId
	label: string
	emoji: string
	subtypes: string[]
}

export const VEHICLE_DOCUMENT_TYPES: VehicleDocumentTypeMeta[] = [
	{
		id: 'registration',
		label: 'Registration',
		emoji: '📋',
		subtypes: ['rc', 'registration_renewal'],
	},
	{
		id: 'insurance',
		label: 'Insurance',
		emoji: '🛡️',
		subtypes: ['motor_policy', 'renewal', 'claim'],
	},
	{
		id: 'compliance',
		label: 'Compliance',
		emoji: '✅',
		subtypes: ['puc', 'road_tax', 'permit'],
	},
	{
		id: 'service',
		label: 'Service & Maintenance',
		emoji: '🔧',
		subtypes: ['service_invoice', 'service_record', 'repair', 'maintenance'],
	},
	{
		id: 'warranty',
		label: 'Warranty',
		emoji: '📜',
		subtypes: ['vehicle_warranty', 'extended_warranty', 'warranty_claim'],
	},
	{
		id: 'purchase_finance',
		label: 'Purchase / Finance',
		emoji: '🧾',
		subtypes: ['purchase_invoice', 'loan', 'lease', 'delivery'],
	},
	{
		id: 'other',
		label: 'Other',
		emoji: '📄',
		subtypes: ['challan', 'fastag', 'accessories', 'unknown'],
	},
]

export function getVehicleDocumentTypeMeta(
	typeId: VehicleDocumentTypeId,
): VehicleDocumentTypeMeta {
	return (
		VEHICLE_DOCUMENT_TYPES.find((entry) => entry.id === typeId) ??
		VEHICLE_DOCUMENT_TYPES[VEHICLE_DOCUMENT_TYPES.length - 1]
	)
}
