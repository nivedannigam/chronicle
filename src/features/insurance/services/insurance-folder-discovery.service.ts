import {
	getCategoryMeta,
	resolveCategoryFromFolderHint,
} from '@/features/insurance-knowledge/graph/policy-categories'
import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'

export interface DiscoveredInsuranceCategory {
	id: PolicyCategoryId
	label: string
	emoji: string
}

const SHORT_FOLDER_HINTS: Record<string, PolicyCategoryId> = {
	health: 'health',
	vehicle: 'motor',
	motor: 'motor',
	car: 'motor',
	home: 'home',
	property: 'home',
	life: 'life_term',
	term: 'life_term',
	travel: 'travel',
}

export function discoverInsuranceCategoriesFromFolderNames(
	folderNames: string[],
): DiscoveredInsuranceCategory[] {
	const discovered = new Set<PolicyCategoryId>()

	for (const name of folderNames) {
		const fromLongHint = resolveCategoryFromFolderHint(name)

		if (fromLongHint) {
			discovered.add(fromLongHint)
			continue
		}

		const normalized = name.toLowerCase()

		for (const [hint, categoryId] of Object.entries(SHORT_FOLDER_HINTS)) {
			if (normalized.includes(hint)) {
				discovered.add(categoryId)
			}
		}
	}

	return [...discovered].map((id) => {
		const meta = getCategoryMeta(id)

		return {
			id,
			label: meta.name.replace(' Insurance', '').replace('Term / ', ''),
			emoji: meta.emoji,
		}
	})
}

export function formatDiscoveredCategoriesLabel(
	categories: DiscoveredInsuranceCategory[],
): string {
	if (categories.length === 0) {
		return 'Chronicle will discover categories automatically when you scan.'
	}

	return categories
		.map((category) => `${category.emoji} ${category.label}`)
		.join(' · ')
}
