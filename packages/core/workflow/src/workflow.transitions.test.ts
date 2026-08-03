import { describe, expect, it } from 'vitest'
import { canTransition, WORKFLOW_TRANSITIONS } from './workflow.types'

describe('WORKFLOW_TRANSITIONS from READY', () => {
	it('allows FAILED for reprocess reset', () => {
		expect(WORKFLOW_TRANSITIONS.READY).toEqual(['FAILED'])
		expect(canTransition('READY', 'FAILED')).toBe(true)
	})
})

describe('WORKFLOW_TRANSITIONS from PARSING', () => {
	it('allows INDEXING, READY, and FAILED only', () => {
		expect(WORKFLOW_TRANSITIONS.PARSING).toEqual([
			'INDEXING',
			'READY',
			'FAILED',
		])
	})

	it('rejects PENDING_REVIEW after parse (pre-import state only)', () => {
		expect(canTransition('PARSING', 'PENDING_REVIEW')).toBe(false)
		expect(canTransition('PARSING', 'FAILED')).toBe(true)
		expect(canTransition('PARSING', 'INDEXING')).toBe(true)
	})
})
