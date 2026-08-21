import type {
	PropertyAttentionItem,
	PropertyDocumentRecord,
	PropertyRecord,
} from '@/features/property-knowledge/types/property-knowledge.types'
import {
	getPropertyDocumentTypeDefinition,
	PRIMARY_PROPERTY_DOCUMENT_TYPES,
} from '@/features/property-knowledge/services/property-type.registry'

function hasDocumentType(
	documents: PropertyDocumentRecord[],
	propertyId: string,
	typeId: PropertyDocumentRecord['typeId'],
): boolean {
	return documents.some(
		(document) =>
			document.propertyId === propertyId && document.typeId === typeId,
	)
}

export function buildPropertyAttentionItems(input: {
	properties: PropertyRecord[]
	documents: PropertyDocumentRecord[]
}): PropertyAttentionItem[] {
	const items: PropertyAttentionItem[] = []

	for (const property of input.properties) {
		if (property.resolutionState === 'ambiguous') {
			items.push({
				id: `ownership-${property.id}`,
				propertyId: property.id,
				documentId: null,
				headline: 'Ownership needs confirmation',
				subline: `${property.displayName} · review ownership details`,
				severity: 'medium',
				reason: 'ownership_unresolved',
				evidenceDocumentIds: property.sourceDocumentIds,
			})
		}

		for (const typeId of PRIMARY_PROPERTY_DOCUMENT_TYPES) {
			if (hasDocumentType(input.documents, property.id, typeId)) {
				continue
			}

			items.push({
				id: `missing-${property.id}-${typeId}`,
				propertyId: property.id,
				documentId: null,
				headline: `${getPropertyDocumentTypeDefinition(typeId).label} missing`,
				subline: property.displayName,
				severity: 'medium',
				reason: 'document_missing',
				evidenceDocumentIds: [],
			})
		}

		const taxDocuments = input.documents.filter(
			(document) =>
				document.propertyId === property.id &&
				document.typeId === 'property-tax',
		)
		const latestTax = taxDocuments
			.filter((document) => document.documentDate)
			.sort((left, right) =>
				(right.documentDate ?? '').localeCompare(left.documentDate ?? ''),
			)[0]

		if (taxDocuments.length > 0 && !latestTax?.documentDate) {
			items.push({
				id: `registration-${property.id}`,
				propertyId: property.id,
				documentId: latestTax?.chronicleDocumentId ?? null,
				headline: 'Property tax details incomplete',
				subline: property.displayName,
				severity: 'low',
				reason: 'registration_incomplete',
				evidenceDocumentIds: taxDocuments.map(
					(document) => document.chronicleDocumentId,
				),
			})
		}

		const insuranceDocs = input.documents.filter(
			(document) =>
				document.propertyId === property.id &&
				document.typeId === 'property-insurance',
		)

		if (insuranceDocs.length === 0) {
			items.push({
				id: `insurance-${property.id}`,
				propertyId: property.id,
				documentId: null,
				headline: 'Property insurance not on file',
				subline: property.displayName,
				severity: 'low',
				reason: 'insurance_missing',
				evidenceDocumentIds: [],
			})
		}

		for (const document of insuranceDocs) {
			if (!document.expiryDate) {
				continue
			}

			const expiry = new Date(document.expiryDate)
			const daysUntil = Math.ceil(
				(expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
			)

			if (daysUntil <= 60) {
				items.push({
					id: `insurance-expiry-${document.chronicleDocumentId}`,
					propertyId: property.id,
					documentId: document.chronicleDocumentId,
					headline: 'Property insurance expiring soon',
					subline: `${property.displayName} · ${document.typeLabel}`,
					severity: daysUntil <= 30 ? 'high' : 'medium',
					reason: 'insurance_expiring',
					evidenceDocumentIds: [document.chronicleDocumentId],
				})
			}
		}
	}

	return items.slice(0, 6)
}
