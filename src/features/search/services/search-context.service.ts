import type { SemanticSearchHit } from '@/features/intelligence/types/intelligence.types'

export type SearchContextModule =
	'health' | 'insurance' | 'vehicles' | 'identity' | 'finance' | 'property'

const CONTEXT_TO_DOMAIN: Record<
	SearchContextModule,
	SemanticSearchHit['domain']
> = {
	health: 'health',
	insurance: 'insurance',
	vehicles: 'vehicles',
	identity: 'identity',
	finance: 'finance',
	property: 'property',
}

const DOCUMENT_CATEGORY_BY_CONTEXT: Partial<
	Record<SearchContextModule, string>
> = {
	health: 'medical',
	insurance: 'insurance',
	vehicles: 'vehicles',
	identity: 'identity',
	finance: 'financial',
	property: 'property',
}

export function parseSearchContextModule(
	value: string | null | undefined,
): SearchContextModule | null {
	if (!value) {
		return null
	}

	const normalized = value.trim().toLowerCase()
	if (
		normalized === 'health' ||
		normalized === 'insurance' ||
		normalized === 'vehicles' ||
		normalized === 'identity' ||
		normalized === 'finance' ||
		normalized === 'property'
	) {
		return normalized
	}

	return null
}

export function resolveSearchScopeCopy(context: SearchContextModule | null): {
	title: string
	subtitle: string | null
	placeholder: string
	emptyMessage: string
} {
	if (!context) {
		return {
			title: 'Search',
			subtitle: null,
			placeholder: 'Search everything…',
			emptyMessage:
				'Try different keywords, or ask Chronicle to interpret your question.',
		}
	}

	const labels: Record<SearchContextModule, string> = {
		health: 'Health',
		insurance: 'Insurance',
		vehicles: 'Vehicles',
		identity: 'Identity',
		finance: 'Finance',
		property: 'Property',
	}

	const label = labels[context]

	return {
		title: `${label} search`,
		subtitle: `Prioritizing ${label.toLowerCase()} records`,
		placeholder: `Search ${label.toLowerCase()} records…`,
		emptyMessage: `No ${label.toLowerCase()} results matched your search.`,
	}
}

export function applySearchContextRanking(
	hits: SemanticSearchHit[],
	context: SearchContextModule | null,
): SemanticSearchHit[] {
	if (!context) {
		return hits
	}

	const preferredDomain = CONTEXT_TO_DOMAIN[context]
	const preferredCategory = DOCUMENT_CATEGORY_BY_CONTEXT[context]

	return [...hits]
		.map((hit) => {
			let score = hit.score

			if (hit.domain === preferredDomain) {
				score += 0.55
			} else if (
				hit.domain === 'documents' &&
				preferredCategory &&
				hit.reportType === preferredCategory
			) {
				score += 0.35
			} else if (hit.domain !== 'photos') {
				score *= 0.82
			}

			return { ...hit, score }
		})
		.sort((left, right) => right.score - left.score)
}
