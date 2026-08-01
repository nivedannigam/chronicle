import { describe, expect, it, beforeEach, vi } from 'vitest'
import { buildBetaExperienceTurn } from '@/features/ask/beta/beta-domain-handlers'
import { BETA_EXPERIENCE_BY_ID } from '@/features/ask/beta/beta-experiences'
import {
	clearAskFeedbackLog,
	clearBetaObservabilityLog,
	getFeedbackForTurn,
	recordAskFeedback,
	recordBetaExperienceUsage,
} from '@/features/ask/beta/beta-observability.service'

describe('buildBetaExperienceTurn', () => {
	it('returns structured family health summary', () => {
		const turn = buildBetaExperienceTurn({
			experience: BETA_EXPERIENCE_BY_ID['family-health-summary'],
			question: 'Summarize my family health.',
			userId: 'user-1',
			member: {
				memberId: null,
				memberName: 'Alex',
				familyMemberNames: ['Alex'],
			},
			familyMembers: [
				{
					id: 'owner',
					userId: 'user-1',
					familyId: null,
					displayName: 'Alex',
					isAccountOwner: true,
					aliases: [],
					relationship: 'self',
					roleId: 'adult',
					dateOfBirth: null,
					gender: null,
					status: 'active',
					avatarUrl: null,
					sortOrder: 0,
					createdAt: '',
					updatedAt: '',
				},
			],
			uploadedReports: [],
		})

		expect(turn).not.toBeNull()
		expect(turn?.clinicalAnswer?.executiveSummary).toBeTruthy()
		expect(turn?.clinicalAnswer?.keyFindings.length).toBeGreaterThan(0)
		expect(turn?.clinicalAnswer?.recommendations.length).toBeGreaterThan(0)
		expect(turn?.clinicalAnswer?.limitations.length).toBeGreaterThan(0)
		expect(turn?.betaExperienceId).toBe('family-health-summary')
	})

	it('returns null for production-health experiences', () => {
		const turn = buildBetaExperienceTurn({
			experience: BETA_EXPERIENCE_BY_ID['summarize-latest-report'],
			question: 'Summarize my latest health report.',
			userId: 'user-1',
			member: {
				memberId: null,
				memberName: 'Alex',
				familyMemberNames: ['Alex'],
			},
		})

		expect(turn).toBeNull()
	})
})

describe('beta observability and feedback', () => {
	const storage = new Map<string, string>()

	beforeEach(() => {
		clearAskFeedbackLog()
		clearBetaObservabilityLog()
		storage.clear()

		vi.stubGlobal('window', {
			localStorage: {
				getItem: (key: string) => storage.get(key) ?? null,
				setItem: (key: string, value: string) => {
					storage.set(key, value)
				},
				removeItem: (key: string) => {
					storage.delete(key)
				},
			},
		})
	})

	it('records feedback and usage', () => {
		recordBetaExperienceUsage({
			userId: 'user-1',
			memberId: null,
			experienceId: 'find-document',
			question: 'Where is my passport?',
			provider: 'beta-grounded',
			latencyMs: 120,
			confidence: 0.8,
		})

		recordAskFeedback({
			userId: 'user-1',
			turnId: 'turn-1',
			experienceId: 'find-document',
			question: 'Where is my passport?',
			rating: 'up',
		})

		expect(getFeedbackForTurn('user-1', 'turn-1')).toBe('up')
	})
})
