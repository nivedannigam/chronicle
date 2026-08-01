import { describe, expect, it } from 'vitest'
import { resolveBetaExperience } from '@/features/ask/beta/beta-experience-resolver'
import { BETA_EXPERIENCES } from '@/features/ask/beta/beta-experiences'

describe('resolveBetaExperience', () => {
	it('matches all ten canonical beta questions', () => {
		for (const experience of BETA_EXPERIENCES) {
			const resolved = resolveBetaExperience(experience.canonicalQuestion)
			expect(resolved?.id).toBe(experience.id)
		}
	})

	it('maps health summarize intent', () => {
		expect(
			resolveBetaExperience('Summarize my latest health report.')?.id,
		).toBe('summarize-latest-report')
	})

	it('maps document find intent', () => {
		expect(resolveBetaExperience('Where is my passport?')?.id).toBe(
			'find-document',
		)
	})

	it('maps family health summary', () => {
		expect(resolveBetaExperience('Summarize my family health.')?.id).toBe(
			'family-health-summary',
		)
	})

	it('returns null for unrelated questions', () => {
		expect(resolveBetaExperience('What is the weather today?')).toBeNull()
	})
})
