import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'

export interface VehicleDocumentClassification {
	documentType: VehicleDocumentTypeId
	documentSubtype: string
	confidence: number
	reason: string
}

const FOLDER_HINTS: Array<{
	pattern: RegExp
	documentType: VehicleDocumentTypeId
	subtype: string
}> = [
	{
		pattern: /\brc\b|registration/i,
		documentType: 'registration',
		subtype: 'rc',
	},
	{
		pattern: /insurance|policy|renewal/i,
		documentType: 'insurance',
		subtype: 'motor_policy',
	},
	{ pattern: /\bpuc\b|pollution/i, documentType: 'compliance', subtype: 'puc' },
	{
		pattern: /road\s*tax|tax/i,
		documentType: 'compliance',
		subtype: 'road_tax',
	},
	{ pattern: /permit/i, documentType: 'compliance', subtype: 'permit' },
	{
		pattern: /service|maintenance|repair/i,
		documentType: 'service',
		subtype: 'service_invoice',
	},
	{
		pattern: /warranty/i,
		documentType: 'warranty',
		subtype: 'vehicle_warranty',
	},
	{
		pattern: /purchase|invoice|delivery|loan|lease|finance/i,
		documentType: 'purchase_finance',
		subtype: 'purchase_invoice',
	},
	{ pattern: /challan|fine/i, documentType: 'other', subtype: 'challan' },
	{ pattern: /fastag|fast\s*tag/i, documentType: 'other', subtype: 'fastag' },
]

const FILE_HINTS: Array<{
	pattern: RegExp
	documentType: VehicleDocumentTypeId
	subtype: string
}> = [
	{
		pattern: /\brc\b|registration\s*certificate/i,
		documentType: 'registration',
		subtype: 'rc',
	},
	{
		pattern: /insurance|policy|renewal/i,
		documentType: 'insurance',
		subtype: 'motor_policy',
	},
	{ pattern: /\bpuc\b|pollution/i, documentType: 'compliance', subtype: 'puc' },
	{
		pattern: /service|workshop|repair|maintenance/i,
		documentType: 'service',
		subtype: 'service_invoice',
	},
	{
		pattern: /warranty/i,
		documentType: 'warranty',
		subtype: 'vehicle_warranty',
	},
	{
		pattern: /purchase|delivery|loan|lease/i,
		documentType: 'purchase_finance',
		subtype: 'purchase_invoice',
	},
]

export function classifyVehicleDocument(input: {
	fileName: string
	folderPath?: string | null
}): VehicleDocumentClassification {
	const searchable = `${input.fileName} ${input.folderPath ?? ''}`

	for (const hint of FOLDER_HINTS) {
		if (hint.pattern.test(input.folderPath ?? '')) {
			return {
				documentType: hint.documentType,
				documentSubtype: hint.subtype,
				confidence: 0.82,
				reason: `Folder context (${hint.subtype})`,
			}
		}
	}

	for (const hint of FILE_HINTS) {
		if (hint.pattern.test(input.fileName)) {
			return {
				documentType: hint.documentType,
				documentSubtype: hint.subtype,
				confidence: 0.72,
				reason: `Filename (${hint.subtype})`,
			}
		}
	}

	if (/\.pdf$/i.test(input.fileName)) {
		return {
			documentType: 'other',
			documentSubtype: 'unknown',
			confidence: 0.35,
			reason: searchable.trim() ? 'Vehicle PDF' : 'Unknown vehicle document',
		}
	}

	return {
		documentType: 'other',
		documentSubtype: 'unknown',
		confidence: 0.2,
		reason: 'Unclassified vehicle document',
	}
}
