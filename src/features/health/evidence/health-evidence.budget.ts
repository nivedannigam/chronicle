import type { QuestionType } from '@/shared/ai/evidence-planning/types'

export interface EvidenceBudget {
	maxReports: number
	maxMetricRows: number
	maxTrends: number
	maxTimeline: number
}

/** Applied after full evidence assembly — not during retrieval. */
export function budgetForQuestionType(
	questionType: QuestionType,
): EvidenceBudget {
	switch (questionType) {
		case 'FACT_LOOKUP':
			return {
				maxReports: 2,
				maxMetricRows: 3,
				maxTrends: 1,
				maxTimeline: 2,
			}
		case 'LATEST_REPORT':
			return {
				maxReports: 4,
				maxMetricRows: 24,
				maxTrends: 8,
				maxTimeline: 8,
			}
		case 'COMPARE':
			return {
				maxReports: 8,
				maxMetricRows: 32,
				maxTrends: 12,
				maxTimeline: 12,
			}
		case 'TREND':
			return {
				maxReports: 10,
				maxMetricRows: 40,
				maxTrends: 16,
				maxTimeline: 12,
			}
		case 'EXPLAIN':
			return {
				maxReports: 4,
				maxMetricRows: 12,
				maxTrends: 4,
				maxTimeline: 6,
			}
		case 'STATUS_OVERVIEW':
			return {
				maxReports: 12,
				maxMetricRows: 36,
				maxTrends: 10,
				maxTimeline: 12,
			}
		case 'UNKNOWN':
		default:
			return {
				maxReports: 10,
				maxMetricRows: 30,
				maxTrends: 8,
				maxTimeline: 10,
			}
	}
}

export function applyBudget<T>(items: T[], max: number): T[] {
	if (max <= 0) {
		return []
	}

	return items.length <= max ? items : items.slice(0, max)
}
