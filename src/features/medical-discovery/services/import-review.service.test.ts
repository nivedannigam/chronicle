import { describe, expect, it } from 'vitest'

const COMPLETED_IMPORT_STATUSES = new Set(['completed', 'skipped'])

function isActionableReviewDocument(row: {
	approval_status: string
	import_status: string
}): boolean {
	if (row.approval_status === 'pending') {
		return true
	}

	if (
		row.approval_status === 'approved' &&
		!COMPLETED_IMPORT_STATUSES.has(row.import_status)
	) {
		return true
	}

	return false
}

describe('review queue actionable filter', () => {
	it('includes pending approval documents', () => {
		expect(
			isActionableReviewDocument({
				approval_status: 'pending',
				import_status: 'discovered',
			}),
		).toBe(true)
	})

	it('includes approved failed imports after auto-approve journey', () => {
		expect(
			isActionableReviewDocument({
				approval_status: 'approved',
				import_status: 'failed',
			}),
		).toBe(true)
	})

	it('excludes completed imports', () => {
		expect(
			isActionableReviewDocument({
				approval_status: 'approved',
				import_status: 'completed',
			}),
		).toBe(false)
	})
})
