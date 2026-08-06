import type { PolicyHistory } from '@/features/insurance-knowledge/types/insurance-knowledge.types'

const CORE_CATEGORY_COUNT = 3

export function computeProtectionScoreFromHistories(
	histories: PolicyHistory[],
): number | null {
	if (histories.length === 0) {
		return null
	}

	const activeHistories = histories.filter(
		(history) => history.status === 'active',
	)

	if (activeHistories.length === 0) {
		return 15
	}

	let score = 40

	const activeCategories = new Set(
		activeHistories.map((history) => history.policyType),
	)
	score += Math.min(activeCategories.size / CORE_CATEGORY_COUNT, 1) * 30

	const withSumInsured = activeHistories.filter(
		(history) => history.sumInsured != null,
	).length
	score += (withSumInsured / activeHistories.length) * 15

	const expiring = activeHistories.filter((history) => {
		const target = history.expiryDate ?? history.renewalDate

		if (!target) {
			return false
		}

		const days = Math.ceil(
			(new Date(target).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
		)

		return days >= 0 && days <= 30
	}).length

	if (expiring > 0) {
		score -= Math.min(expiring * 8, 20)
	}

	const lapsed = histories.filter(
		(history) => history.status === 'lapsed' || history.status === 'expired',
	).length

	if (lapsed > 0) {
		score -= Math.min(lapsed * 5, 15)
	}

	const avgConfidence =
		activeHistories.reduce((sum, history) => sum + history.confidence, 0) /
		activeHistories.length
	score += avgConfidence * 15

	return Math.max(0, Math.min(100, Math.round(score)))
}
