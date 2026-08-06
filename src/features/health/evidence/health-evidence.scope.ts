import { detectCategoryFromQuestion } from '@/shared/ai/intent/category-intent.patterns'
import type { EvidenceRequest } from '@/shared/ai/evidence-planning/types'

export interface SubjectScope {
	metricIds: string[]
	metricNames: string[]
	categoryHints: string[]
	reportId?: string
	reportIds?: string[]
	timeRangeYears?: number
	/** No specific organ/metric focus — whole-health questions. */
	isWholeHealth: boolean
}

export function inferSubjectScope(request: EvidenceRequest): SubjectScope {
	const { subject, question } = request
	const questionCategory = detectCategoryFromQuestion(question)
	const categoryHints = [
		...new Set(
			[subject.categoryId, questionCategory].filter((value): value is string =>
				Boolean(value),
			),
		),
	]

	const hasMetricFocus =
		(subject.metricIds?.length ?? 0) > 0 ||
		(subject.metricNames?.length ?? 0) > 0
	const hasReportFocus =
		Boolean(subject.reportId) || (subject.reportIds?.length ?? 0) > 0
	const hasCategoryFocus = categoryHints.length > 0

	const isWholeHealth =
		!hasMetricFocus &&
		!hasReportFocus &&
		!hasCategoryFocus &&
		/\bsummarize my health\b|\boverall health\b|\bhow am i doing\b|\bhealth overall\b/i.test(
			question,
		)

	return {
		metricIds: subject.metricIds ?? [],
		metricNames: subject.metricNames ?? [],
		categoryHints,
		reportId: subject.reportId,
		reportIds: subject.reportIds,
		timeRangeYears: subject.timeRangeYears,
		isWholeHealth:
			isWholeHealth ||
			(!hasMetricFocus && !hasReportFocus && !hasCategoryFocus),
	}
}

export function scopeMatchesCanonicalId(
	scope: SubjectScope,
	canonicalId: string,
	displayName: string,
): boolean {
	if (scope.metricIds.length === 0 && scope.metricNames.length === 0) {
		return true
	}

	if (scope.metricIds.includes(canonicalId)) {
		return true
	}

	const normalizedName = displayName.toLowerCase()

	return scope.metricNames.some((name) =>
		normalizedName.includes(name.toLowerCase()),
	)
}
