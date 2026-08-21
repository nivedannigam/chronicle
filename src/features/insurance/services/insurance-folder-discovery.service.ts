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
	mediclaim: 'health',
	medical: 'health',
	vehicle: 'motor',
	motor: 'motor',
	car: 'motor',
	home: 'home',
	house: 'home',
	property: 'home',
	life: 'life_term',
	term: 'life_term',
	travel: 'travel',
}

export function inferInsurerFromFileName(fileName: string): string | null {
	const base = fileName.replace(/\.[^.]+$/i, '').trim()
	const match = base.match(/^(.+?)\s[-–—]\s/)

	if (match?.[1]?.trim()) {
		return match[1].trim()
	}

	const firstToken = base.split(/\s+/)[0]

	if (firstToken && firstToken.length >= 3) {
		return firstToken
	}

	return null
}

export function inferCategoryFromFolderPath(
	folderPath: string | null | undefined,
): PolicyCategoryId | null {
	if (!folderPath?.trim()) {
		return null
	}

	const segments = folderPath.split('/').filter(Boolean)
	const discovered = discoverInsuranceCategoriesFromFolderNames(segments)

	return discovered[0]?.id ?? null
}

const VALID_CATEGORY_HINTS = new Set<PolicyCategoryId>([
	'health',
	'life_term',
	'motor',
	'home',
	'travel',
])

export function resolveInsuranceCategoryHint(input: {
	categoryHint?: string | null
	folderPath?: string | null
	fileName?: string | null
}): PolicyCategoryId | null {
	const fromPath = inferCategoryFromFolderPath(input.folderPath)

	if (fromPath) {
		return fromPath
	}

	const explicitHint = input.categoryHint?.trim()

	if (
		explicitHint &&
		VALID_CATEGORY_HINTS.has(explicitHint as PolicyCategoryId)
	) {
		return explicitHint as PolicyCategoryId
	}

	if (input.fileName?.trim()) {
		const fromFileName = discoverInsuranceCategoriesFromFolderNames([
			input.fileName.replace(/\.[^.]+$/, ''),
		])[0]?.id

		if (fromFileName) {
			return fromFileName
		}
	}

	return null
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
