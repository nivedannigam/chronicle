/** Shared organ/category detection for production and legacy intent classifiers. */
export const CATEGORY_QUERY_PATTERNS: Array<{
	pattern: RegExp
	categoryId: string
}> = [
	{ pattern: /\bliver\b|\balt\b|\bast\b|\blft\b/i, categoryId: 'liver' },
	{
		pattern:
			/\bheart\b|\bldl\b|\bhdl\b|\bcholesterol\b|\blipid\b|\becg\b|\belectrocardiogram\b/i,
		categoryId: 'heart',
	},
	{
		pattern: /\bkidney\b|\bcreatinine\b|\begfr\b|\brenal\b/i,
		categoryId: 'kidney',
	},
	{
		pattern: /\bdiabetes\b|\bhba1c\b|\bglucose\b|\bblood sugar\b/i,
		categoryId: 'diabetes',
	},
	{ pattern: /\bthyroid\b|\btsh\b/i, categoryId: 'thyroid' },
	{
		pattern: /\bvitamin\b|\bvitamin d\b|\bb12\b|\bfolate\b|\bferritin\b/i,
		categoryId: 'vitamin',
	},
	{
		pattern: /\bblood\b|\bhemoglobin\b|\bwbc\b|\bplatelet\b|\bcbc\b/i,
		categoryId: 'blood',
	},
]

const ORGAN_STATUS_PATTERN =
	/\bhow (?:is|are) my\b|\bhow (?:is|are) the\b|\bwhat about my\b|\bshow me my\b|\btell me about my\b/i

const ORGAN_NAME_PATTERN =
	/\b(heart|liver|kidney|thyroid|diabetes|blood|lipids)\b/i

const METRICLESS_REPORT_CATEGORY_PATTERNS: Array<{
	pattern: RegExp
	categoryId: string
}> = [
	{
		pattern: /\becg\b|\belectrocardiogram\b|\becho\b|\bcardiac\b/i,
		categoryId: 'heart',
	},
	{ pattern: /\bultrasound\b|\bsonography\b|\bscan\b/i, categoryId: 'liver' },
]

export function detectCategoryFromQuestion(
	question: string,
): string | undefined {
	for (const { pattern, categoryId } of CATEGORY_QUERY_PATTERNS) {
		if (pattern.test(question)) {
			return categoryId
		}
	}

	return undefined
}

export function isOrganStatusQuestion(question: string): boolean {
	return (
		ORGAN_STATUS_PATTERN.test(question) &&
		ORGAN_NAME_PATTERN.test(question) &&
		Boolean(detectCategoryFromQuestion(question))
	)
}

export function detectCategoryFromReportTitle(
	title: string,
): string | undefined {
	for (const { pattern, categoryId } of METRICLESS_REPORT_CATEGORY_PATTERNS) {
		if (pattern.test(title)) {
			return categoryId
		}
	}

	return undefined
}
