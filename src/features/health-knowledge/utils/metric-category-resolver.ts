import type { MetricCategoryId } from '@/features/health-knowledge/types'

const URINE_MICROSCOPY_PATTERN =
	/\b(bacteria|casts|crystals|pus|epithelial|bile|yeast|mucus|amorphous|nitrite|leucocyte|leukocyte|parasite|urobilinogen|specific gravity|colour|color|appearance|volume)\b/i

export function isUrineMicroscopyMetric(input: {
	canonicalId: string
	displayName?: string
	rawName?: string
}): boolean {
	const haystack = [
		input.canonicalId,
		input.displayName ?? '',
		input.rawName ?? '',
	]
		.join(' ')
		.toLowerCase()

	return URINE_MICROSCOPY_PATTERN.test(haystack)
}

export function resolveMetricCategoryId(input: {
	canonicalId: string
	displayName?: string
	rawName?: string
	definitionCategoryId?: MetricCategoryId
	fallbackCategoryId?: MetricCategoryId
}): MetricCategoryId {
	if (input.definitionCategoryId) {
		return input.definitionCategoryId
	}

	if (
		isUrineMicroscopyMetric(input) ||
		(input.canonicalId.startsWith('raw:') &&
			isUrineMicroscopyMetric({
				canonicalId: input.displayName ?? input.canonicalId,
			}))
	) {
		return 'urine'
	}

	if (input.fallbackCategoryId) {
		return input.fallbackCategoryId
	}

	return 'blood'
}
