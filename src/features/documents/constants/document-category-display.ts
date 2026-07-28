import { FC } from '@/ui/figma/tokens/figma-v2-tokens'
import {
	DOCUMENT_CATEGORY_REGISTRY,
	getDocumentCategory,
	getDocumentSubCategory,
} from '@/features/documents/types/document-categories'

/** Home grid categories — meaning-first, not folder-based. */
export const DOCUMENT_HOME_CATEGORIES = [
	{ categoryId: 'identity', label: 'Identity', emoji: '🪪', color: FC.blue },
	{ categoryId: 'insurance', label: 'Insurance', emoji: '🛡️', color: FC.teal },
	{ categoryId: 'property', label: 'Property', emoji: '🏠', color: FC.orange },
	{ categoryId: 'financial', label: 'Finance', emoji: '💰', color: FC.amber },
	{ categoryId: 'medical', label: 'Health', emoji: '🏥', color: FC.green },
	{
		categoryId: 'employment',
		label: 'Employment',
		emoji: '💼',
		color: FC.indigo,
	},
	{ categoryId: 'education', label: 'Education', emoji: '📚', color: FC.pink },
	{
		categoryId: 'other',
		label: 'Travel & Other',
		emoji: '✈️',
		color: FC.purple,
	},
] as const

/** Future modules — hidden until product enables them. */
export const FUTURE_DOCUMENT_MODULES = [
	{ id: 'vehicles', label: 'Vehicles', available: false },
	{ id: 'investments', label: 'Investments', available: false },
	{ id: 'tax', label: 'Tax', available: false },
	{ id: 'utilities', label: 'Utilities', available: false },
	{ id: 'legal', label: 'Legal', available: false },
] as const

const CATEGORY_RELATIONSHIPS: Record<string, string[]> = {
	identity: ['insurance', 'other', 'financial'],
	insurance: ['identity', 'property', 'medical'],
	property: ['insurance', 'financial', 'employment'],
	financial: ['property', 'employment', 'insurance'],
	employment: ['financial', 'identity'],
	medical: ['insurance', 'identity'],
	education: ['identity', 'employment'],
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
	return DOCUMENT_CATEGORY_REGISTRY.map((category) => category.id)
}

export function getSubCategoryLabel(
	categoryId: string,
	subCategoryId: string | null,
): string | null {
	if (!subCategoryId) return null
	return getDocumentSubCategory(categoryId, subCategoryId)?.label ?? null
}
