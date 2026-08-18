import { getSubCategoryLabel } from '@/features/documents/constants/document-category-display'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

export interface DocumentModuleLink {
	moduleId: string
	label: string
	route: string | null
}

const MODULE_ROUTES: Record<string, string | null> = {
	health: '/health',
	insurance: '/insurance',
	identity: '/identity',
	vehicles: '/vehicles',
	property: null,
	finance: null,
	travel: null,
	employment: null,
	documents: '/documents',
}

const CATEGORY_MODULES: Record<string, DocumentModuleLink[]> = {
	medical: [
		{ moduleId: 'health', label: 'Health', route: MODULE_ROUTES.health },
	],
	insurance: [
		{
			moduleId: 'insurance',
			label: 'Insurance',
			route: MODULE_ROUTES.insurance,
		},
	],
	identity: [
		{ moduleId: 'identity', label: 'Identity', route: MODULE_ROUTES.identity },
		{ moduleId: 'travel', label: 'Travel', route: MODULE_ROUTES.travel },
	],
	vehicles: [
		{ moduleId: 'vehicles', label: 'Vehicles', route: MODULE_ROUTES.vehicles },
		{
			moduleId: 'insurance',
			label: 'Insurance',
			route: MODULE_ROUTES.insurance,
		},
	],
	property: [
		{ moduleId: 'property', label: 'Property', route: MODULE_ROUTES.property },
		{ moduleId: 'finance', label: 'Finance', route: MODULE_ROUTES.finance },
	],
	financial: [
		{ moduleId: 'finance', label: 'Finance', route: MODULE_ROUTES.finance },
	],
	employment: [
		{
			moduleId: 'employment',
			label: 'Employment',
			route: MODULE_ROUTES.employment,
		},
		{ moduleId: 'finance', label: 'Finance', route: MODULE_ROUTES.finance },
	],
	travel: [
		{ moduleId: 'travel', label: 'Travel', route: MODULE_ROUTES.travel },
		{ moduleId: 'identity', label: 'Identity', route: MODULE_ROUTES.identity },
	],
	education: [
		{
			moduleId: 'documents',
			label: 'Documents',
			route: MODULE_ROUTES.documents,
		},
	],
	personal: [
		{
			moduleId: 'documents',
			label: 'Documents',
			route: MODULE_ROUTES.documents,
		},
	],
	other: [
		{
			moduleId: 'documents',
			label: 'Documents',
			route: MODULE_ROUTES.documents,
		},
	],
}

const SUBCATEGORY_MODULE_OVERRIDES: Record<string, DocumentModuleLink[]> = {
	'vehicle-insurance': [
		{
			moduleId: 'insurance',
			label: 'Insurance',
			route: MODULE_ROUTES.insurance,
		},
		{ moduleId: 'vehicles', label: 'Vehicles', route: MODULE_ROUTES.vehicles },
	],
	'health-insurance': [
		{
			moduleId: 'insurance',
			label: 'Insurance',
			route: MODULE_ROUTES.insurance,
		},
		{ moduleId: 'health', label: 'Health', route: MODULE_ROUTES.health },
	],
	'discharge-summary': [
		{ moduleId: 'health', label: 'Health', route: MODULE_ROUTES.health },
	],
	passport: [
		{ moduleId: 'identity', label: 'Identity', route: MODULE_ROUTES.identity },
		{ moduleId: 'travel', label: 'Travel', route: MODULE_ROUTES.travel },
	],
	'salary-slip': [
		{
			moduleId: 'employment',
			label: 'Employment',
			route: MODULE_ROUTES.employment,
		},
		{ moduleId: 'finance', label: 'Finance', route: MODULE_ROUTES.finance },
	],
	'tax-receipt': [
		{ moduleId: 'property', label: 'Property', route: MODULE_ROUTES.property },
		{ moduleId: 'finance', label: 'Finance', route: MODULE_ROUTES.finance },
	],
}

export function resolveDocumentModuleLinks(
	document: ChronicleDocument,
): DocumentModuleLink[] {
	if (document.knowledge_refs.length > 0) {
		return document.knowledge_refs.map((ref) => ({
			moduleId: ref.domain,
			label: ref.label,
			route: MODULE_ROUTES[ref.domain] ?? null,
		}))
	}

	if (document.sub_category_id) {
		const override = SUBCATEGORY_MODULE_OVERRIDES[document.sub_category_id]

		if (override) {
			return override
		}
	}

	return CATEGORY_MODULES[document.category_id] ?? CATEGORY_MODULES.other!
}

export function buildAiDiscoveryLabel(
	document: ChronicleDocument,
): string | null {
	const subLabel = getSubCategoryLabel(
		document.category_id,
		document.sub_category_id,
	)

	if (subLabel) {
		return `This appears to be a ${subLabel}.`
	}

	const categoryLabels: Record<string, string> = {
		medical: 'Health Report',
		insurance: 'Insurance Policy',
		identity: 'Identity Document',
		vehicles: 'Vehicle Document',
		property: 'Property Document',
		financial: 'Financial Document',
		employment: 'Employment Document',
		travel: 'Travel Document',
		education: 'Education Document',
		personal: 'Personal Document',
	}

	const label = categoryLabels[document.category_id]

	return label ? `This appears to be a ${label}.` : null
}

export function resolveConsumerDocumentStatus(
	document: ChronicleDocument,
): 'Ready' | 'Needs Help' | 'Still Organizing' {
	if (document.status === 'processing') {
		return 'Still Organizing'
	}

	if (document.status === 'failed') {
		return 'Needs Help'
	}

	if (
		document.status === 'active' &&
		(!document.extracted_text ||
			Object.keys(document.extracted_metadata).length === 0)
	) {
		return 'Still Organizing'
	}

	return 'Ready'
}
