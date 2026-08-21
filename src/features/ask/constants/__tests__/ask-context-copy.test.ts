import { describe, expect, it } from 'vitest'
import { resolveAskContextCopy } from '@/features/ask/constants/ask-context-copy'

describe('ask context copy', () => {
	it('uses module-specific subtitles for scoped Ask sessions', () => {
		expect(resolveAskContextCopy('finance').subtitle).toBe(
			'Your finance companion',
		)
		expect(resolveAskContextCopy('insurance').emptyHeadline).toContain(
			'policies',
		)
		expect(resolveAskContextCopy('property').subtitle).toBe(
			'Your property companion',
		)
	})

	it('uses neutral copy when no module context is provided', () => {
		expect(resolveAskContextCopy(undefined).subtitle).toContain('Ask Chronicle')
	})
})
