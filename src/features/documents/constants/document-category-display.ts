import { FC } from '@/ui/figma/tokens/figma-v2-tokens'
import {
	DOCUMENT_CATEGORY_REGISTRY,
	getDocumentCategory,
	getDocumentSubCategory,
} from '@/features/documents/types/document-categories'

/** Home grid categories — meaning-first, not folder-based. */
export const DOCUMENT_HOME_CATEGORIES = [
	{ categoryId: 'medical', label: 'Health', emoji: '🏥', color: FC.green },
	{ categoryId: 'insurance', label: 'Insurance', emoji: '🛡️', color: FC.teal },
	{ categoryId: 'identity', label: 'Identity', emoji: '🪪', color: FC.blue },
	{ categoryId: 'vehicles', label: 'Vehicles', emoji: '🚗', color: FC.orange },
	{ categoryId: 'property', label: 'Property', emoji: '🏠', color: FC.amber },
	{ categoryId: 'financial', label: 'Finance', emoji: '💰', color: FC.amber },
	{ categoryId: 'travel', label: 'Travel', emoji: '✈️', color: FC.purple },
	{
		categoryId: 'education',
		label: 'Education',
		emoji: '📚',
		color: FC.pink,
	},
	{
		categoryId: 'employment',
		label: 'Employment',
		emoji: '💼',
		color: FC.indigo,
	},
	{ categoryId: 'personal', label: 'Personal', emoji: '📁', color: FC.mid },
] as const

/** Future modules — hidden until product enables them. */
export const FUTURE_DOCUMENT_MODULES = [
	{ id: 'tax', label: 'Tax', available: false },
	{ id: 'legal', label: 'Legal', available: false },
	{ id: 'utilities', label: 'Utilities', available: false },
] as const

const CATEGORY_RELATIONSHIPS: Record<string, string[]> = {
	identity: ['insurance', 'travel', 'financial'],
	insurance: ['identity', 'property', 'medical', 'vehicles'],
	property: ['insurance', 'financial', 'employment'],
	financial: ['property', 'employment', 'insurance'],
	employment: ['financial', 'identity'],
	medical: ['insurance', 'identity'],
	education: ['identity', 'employment'],
	travel: ['identity', 'insurance'],
	vehicles: ['insurance', 'identity'],
	personal: ['identity', 'financial'],
	other: ['identity', 'insurance'],
}

export function getRelatedCategoryIds(categoryId: string): string[] {
	return CATEGORY_RELATIONSHIPS[categoryId] ?? []
}

export function getCategoryDisplayMeta(categoryId: string) {
	const fromHome = DOCUMENT_HOME_CATEGORIES.find(
		(item) => item.categoryId === categoryId,
	)

	if (fromHome) {
		return fromHome
	}

	const registry = getDocumentCategory(categoryId)

	return {
		categoryId,
		label: registry?.label ?? 'Unknown',
		emoji: '📄',
		color: FC.mid,
	}
}

export function getAllCategoryIds(): string[] {
	return DOCUMENT_HOME_CATEGORIES.map((category) => category.categoryId)
}

export function getSubCategoryLabel(
	categoryId: string,
	subCategoryId: string | null,
): string | null {
	if (!subCategoryId) return null
	return getDocumentSubCategory(categoryId, subCategoryId)?.label ?? null
}

export { DOCUMENT_CATEGORY_REGISTRY }
