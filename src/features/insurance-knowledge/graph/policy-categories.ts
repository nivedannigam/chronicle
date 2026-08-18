import { C } from '@/constants/colors'
import type {
	PolicyCategory,
	PolicyCategoryId,
} from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import type { InsurancePolicyType } from '@/features/insurance-knowledge/types/insurance-record.types'

const CATEGORY_META: Record<
	PolicyCategoryId,
	{ name: string; emoji: string; color: string }
> = {
	health: { name: 'Health Insurance', emoji: '🏥', color: C.teal },
	life_term: {
		name: 'Term / Life Insurance',
		emoji: '🛡️',
		color: C.accentBlue,
	},
	motor: { name: 'Vehicle Insurance', emoji: '🚗', color: C.orange },
	home: { name: 'Home Insurance', emoji: '🏠', color: C.greenAlt },
	travel: { name: 'Travel Insurance', emoji: '✈️', color: C.accent },
}

const POLICY_TYPE_TO_CATEGORY: Record<InsurancePolicyType, PolicyCategoryId> = {
	health: 'health',
	life_term: 'life_term',
	motor: 'motor',
	home: 'home',
	travel: 'travel',
	other: 'health',
}

const FOLDER_HINTS: Record<string, PolicyCategoryId> = {
	'health insurance': 'health',
	'medical insurance': 'health',
	mediclaim: 'health',
	'term insurance': 'life_term',
	'life insurance': 'life_term',
	'term life': 'life_term',
	'life policy': 'life_term',
	'vehicle insurance': 'motor',
	'motor insurance': 'motor',
	'car insurance': 'motor',
	'motor policy': 'motor',
	'home insurance': 'home',
	'property insurance': 'home',
	'home protection': 'home',
	'house insurance': 'home',
	'travel insurance': 'travel',
}

export function getPolicyCategories(): PolicyCategory[] {
	return (Object.keys(CATEGORY_META) as PolicyCategoryId[]).map((id) => ({
		id,
		...CATEGORY_META[id],
		policyTypes: Object.entries(POLICY_TYPE_TO_CATEGORY)
			.filter(([, categoryId]) => categoryId === id)
			.map(([policyType]) => policyType as InsurancePolicyType),
	}))
}

export function getCategoryMeta(categoryId: PolicyCategoryId): {
	name: string
	emoji: string
	color: string
} {
	return CATEGORY_META[categoryId]
}

export function mapPolicyTypeToCategoryId(
	policyType: InsurancePolicyType,
): PolicyCategoryId {
	return POLICY_TYPE_TO_CATEGORY[policyType] ?? 'health'
}

export function resolveCategoryFromFolderHint(
	folderPath: string,
): PolicyCategoryId | null {
	const normalized = folderPath.toLowerCase()

	for (const [hint, categoryId] of Object.entries(FOLDER_HINTS)) {
		if (normalized.includes(hint)) {
			return categoryId
		}
	}

	return null
}

export function findCategoryById(
	categoryId: PolicyCategoryId,
): PolicyCategory | undefined {
	return getPolicyCategories().find((category) => category.id === categoryId)
}
