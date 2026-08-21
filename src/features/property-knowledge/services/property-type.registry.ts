import type { PropertyTypeId } from '@/features/property-knowledge/types/property-knowledge.types'

export type PropertyDocumentTypeId =
	| 'purchase-sale'
	| 'agreement'
	| 'registration'
	| 'possession'
	| 'property-tax'
	| 'society-maintenance'
	| 'home-loan'
	| 'utility'
	| 'property-insurance'
	| 'warranty'
	| 'renovation'
	| 'legal'
	| 'other'

export interface PropertyDocumentTypeDefinition {
	id: PropertyDocumentTypeId
	label: string
	keywords: string[]
	folderKeywords: string[]
	subCategoryIds: string[]
}

export interface PropertyTypeDefinition {
	id: PropertyTypeId
	label: string
	keywords: string[]
}

/** Controlled Property document taxonomy — keep small; unknown stays Other. */
export const PROPERTY_DOCUMENT_TYPE_REGISTRY: PropertyDocumentTypeDefinition[] =
	[
		{
			id: 'purchase-sale',
			label: 'Purchase / Sale',
			keywords: [
				'sale deed',
				'purchase deed',
				'sale agreement',
				'purchase agreement',
			],
			folderKeywords: ['purchase', 'sale'],
			subCategoryIds: ['purchase-sale', 'sale-agreement'],
		},
		{
			id: 'agreement',
			label: 'Agreement',
			keywords: ['agreement', 'mou', 'memorandum'],
			folderKeywords: ['agreement'],
			subCategoryIds: ['agreement', 'lease'],
		},
		{
			id: 'registration',
			label: 'Registration',
			keywords: ['registration', 'registered', 'index ii', 'index 2'],
			folderKeywords: ['registration'],
			subCategoryIds: ['registration'],
		},
		{
			id: 'possession',
			label: 'Possession',
			keywords: [
				'possession',
				'handover',
				'occupancy certificate',
				'oc certificate',
			],
			folderKeywords: ['possession'],
			subCategoryIds: ['possession'],
		},
		{
			id: 'property-tax',
			label: 'Property Tax',
			keywords: ['property tax', 'tax receipt', 'municipal tax', 'pt receipt'],
			folderKeywords: ['property tax', 'tax'],
			subCategoryIds: ['property-tax', 'tax-receipt'],
		},
		{
			id: 'society-maintenance',
			label: 'Society / Maintenance',
			keywords: ['society', 'maintenance', 'housing society', 'hoa'],
			folderKeywords: ['society', 'maintenance'],
			subCategoryIds: ['society-maintenance'],
		},
		{
			id: 'home-loan',
			label: 'Home Loan',
			keywords: [
				'home loan',
				'housing loan',
				'sanction letter',
				'loan agreement',
			],
			folderKeywords: ['home loan', 'loan'],
			subCategoryIds: ['home-loan'],
		},
		{
			id: 'utility',
			label: 'Electricity / Utility',
			keywords: ['electricity', 'utility', 'power bill', 'water bill'],
			folderKeywords: ['utility', 'electricity'],
			subCategoryIds: ['utility'],
		},
		{
			id: 'property-insurance',
			label: 'Property Insurance',
			keywords: ['home insurance', 'property insurance', 'fire insurance'],
			folderKeywords: ['insurance'],
			subCategoryIds: ['property-insurance', 'home-insurance'],
		},
		{
			id: 'warranty',
			label: 'Warranty',
			keywords: ['warranty', 'guarantee'],
			folderKeywords: ['warranty'],
			subCategoryIds: ['warranty'],
		},
		{
			id: 'renovation',
			label: 'Renovation',
			keywords: ['renovation', 'interior', 'modification', 'contractor'],
			folderKeywords: ['renovation'],
			subCategoryIds: ['renovation'],
		},
		{
			id: 'legal',
			label: 'Legal',
			keywords: ['legal', 'notice', 'affidavit', 'noc', 'encumbrance'],
			folderKeywords: ['legal'],
			subCategoryIds: ['legal'],
		},
		{
			id: 'other',
			label: 'Other',
			keywords: [],
			folderKeywords: [],
			subCategoryIds: ['other'],
		},
	]

export const PROPERTY_TYPE_REGISTRY: PropertyTypeDefinition[] = [
	{
		id: 'apartment',
		label: 'Apartment',
		keywords: ['apartment', 'flat', 'bhk'],
	},
	{
		id: 'house',
		label: 'House',
		keywords: ['house', 'bungalow', 'independent'],
	},
	{ id: 'villa', label: 'Villa', keywords: ['villa'] },
	{ id: 'plot', label: 'Plot', keywords: ['plot', 'land', 'agricultural'] },
	{
		id: 'commercial',
		label: 'Commercial',
		keywords: ['commercial', 'office', 'shop'],
	},
	{ id: 'other', label: 'Other', keywords: [] },
]

export function getPropertyDocumentTypeDefinition(
	typeId: PropertyDocumentTypeId,
): PropertyDocumentTypeDefinition {
	return (
		PROPERTY_DOCUMENT_TYPE_REGISTRY.find((entry) => entry.id === typeId) ??
		PROPERTY_DOCUMENT_TYPE_REGISTRY.find((entry) => entry.id === 'other')!
	)
}

export function getPropertyTypeDefinition(
	typeId: PropertyTypeId,
): PropertyTypeDefinition {
	return (
		PROPERTY_TYPE_REGISTRY.find((entry) => entry.id === typeId) ??
		PROPERTY_TYPE_REGISTRY.find((entry) => entry.id === 'other')!
	)
}

export function resolvePropertyDocumentTypeId(input: {
	subCategoryId: string | null
	fileName: string
	folderPath?: string | null
	title?: string | null
}): PropertyDocumentTypeId {
	if (input.subCategoryId) {
		const match = PROPERTY_DOCUMENT_TYPE_REGISTRY.find((entry) =>
			entry.subCategoryIds.includes(input.subCategoryId!),
		)
		if (match && match.id !== 'other') {
			return match.id
		}
	}

	const haystack = [input.fileName, input.folderPath ?? '', input.title ?? '']
		.join(' ')
		.toLowerCase()

	for (const entry of PROPERTY_DOCUMENT_TYPE_REGISTRY) {
		if (entry.id === 'other') {
			continue
		}

		if (
			entry.folderKeywords.some((keyword) => haystack.includes(keyword)) ||
			entry.keywords.some((keyword) => haystack.includes(keyword))
		) {
			return entry.id
		}
	}

	return 'other'
}

export function inferPropertyTypeId(input: {
	displayName: string
	folderPath?: string | null
	text?: string | null
}): PropertyTypeId {
	const haystack = [input.displayName, input.folderPath ?? '', input.text ?? '']
		.join(' ')
		.toLowerCase()

	for (const entry of PROPERTY_TYPE_REGISTRY) {
		if (entry.id === 'other') {
			continue
		}

		if (entry.keywords.some((keyword) => haystack.includes(keyword))) {
			return entry.id
		}
	}

	return 'other'
}

/** Primary document types used for coverage / missing-document attention. */
export const PRIMARY_PROPERTY_DOCUMENT_TYPES: PropertyDocumentTypeId[] = [
	'purchase-sale',
	'registration',
	'possession',
	'property-tax',
]
