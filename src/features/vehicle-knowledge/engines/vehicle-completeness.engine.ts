import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'
import type { VehicleDocumentRecord } from '@/features/vehicle-knowledge/types/vehicle-record.types'

export interface VehicleDocumentCompletenessItem {
	documentType:
		| VehicleDocumentTypeId
		| 'insurance'
		| 'registration'
		| 'puc'
		| 'service'
		| 'warranty'
	label: string
	available: boolean
	sourceDocumentName: string | null
}

export interface VehicleCompleteness {
	items: VehicleDocumentCompletenessItem[]
	limitations: string[]
}

const COMPLETENESS_CHECKS: Array<{
	key: VehicleDocumentCompletenessItem['documentType']
	label: string
	missingMessage: string
	match: (document: VehicleDocumentRecord) => boolean
}> = [
	{
		key: 'registration',
		label: 'RC',
		missingMessage: 'Registration information not found',
		match: (document) =>
			document.documentType === 'registration' &&
			document.status === 'completed',
	},
	{
		key: 'insurance',
		label: 'Insurance',
		missingMessage: 'Insurance information not found',
		match: (document) =>
			document.documentType === 'insurance' && document.status === 'completed',
	},
	{
		key: 'puc',
		label: 'PUC',
		missingMessage: 'PUC information not found',
		match: (document) =>
			document.documentType === 'compliance' &&
			document.documentSubtype === 'puc' &&
			document.status === 'completed',
	},
	{
		key: 'service',
		label: 'Service',
		missingMessage: 'Service history not found',
		match: (document) =>
			document.documentType === 'service' && document.status === 'completed',
	},
	{
		key: 'warranty',
		label: 'Warranty',
		missingMessage: 'Warranty information not found',
		match: (document) =>
			document.documentType === 'warranty' && document.status === 'completed',
	},
]

export function buildVehicleCompleteness(input: {
	vehicleId: string
	documents: VehicleDocumentRecord[]
}): VehicleCompleteness {
	const vehicleDocuments = input.documents.filter(
		(document) => document.vehicleId === input.vehicleId,
	)
	const items: VehicleDocumentCompletenessItem[] = []
	const limitations: string[] = []

	for (const check of COMPLETENESS_CHECKS) {
		const match = vehicleDocuments.find(check.match)

		items.push({
			documentType: check.key,
			label: check.label,
			available: Boolean(match),
			sourceDocumentName: match?.fileName ?? null,
		})

		if (!match && vehicleDocuments.length > 0) {
			limitations.push(check.missingMessage)
		}
	}

	return { items, limitations }
}
