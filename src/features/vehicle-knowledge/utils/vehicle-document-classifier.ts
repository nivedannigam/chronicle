import { resolveVehicleDocumentClassification } from '@/features/document-intelligence/classification/resolve-domain-classification.service'
import type { VehicleDocumentTypeId } from '@/features/vehicle-knowledge/graph/vehicle-document-types'

export interface VehicleDocumentClassification {
	documentType: VehicleDocumentTypeId
	documentSubtype: string
	confidence: number
	reason: string
}

export function classifyVehicleDocument(input: {
	fileName: string
	folderPath?: string | null
	aiDocumentType?: VehicleDocumentTypeId | null
	aiConfidence?: number
}): VehicleDocumentClassification {
	const resolved = resolveVehicleDocumentClassification(input)

	return {
		documentType: resolved.documentType,
		documentSubtype: resolved.documentSubtype,
		confidence: resolved.confidence,
		reason:
			resolved.source === 'CONTENT_AI'
				? 'Document content (AI)'
				: resolved.source === 'FOLDER'
					? `Folder context (${resolved.documentSubtype})`
					: resolved.source === 'FILENAME'
						? `Filename (${resolved.documentSubtype})`
						: resolved.needsReview
							? 'Needs review'
							: 'Unclassified vehicle document',
	}
}
