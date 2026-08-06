import { describe, expect, it } from 'vitest'
import { buildDailyBrief } from '@/features/os/services/daily-brief.service'
import { buildLifeScore } from '@/features/os/services/life-score.service'
import { InsuranceKnowledgeProvider } from '@/features/insurance-knowledge/providers/insurance-knowledge.provider'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'

describe('Chronicle OS life score', () => {
	it('computes weighted overall score from health and protection', () => {
		const score = buildLifeScore({
			metricHistories: [],
			insuranceKnowledge: null,
			documents: [],
		})

		expect(score.dimensions.map((dimension) => dimension.id)).toEqual([
			'health',
			'protection',
			'identity',
		])
		expect(score.overallLabel).toBeTruthy()
	})
})

describe('Chronicle OS daily brief', () => {
	it('generates calm brief when nothing needs attention', () => {
		const provider = new InsuranceKnowledgeProvider({
			fetchRawData: async () => ({}) as InsuranceKnowledgeRawData,
		})

		const knowledge = provider.buildFromRawData(
			{
				policies: [],
				coverages: [],
				members: [],
				nominees: [],
				premiums: [],
				renewals: [],
				claims: [],
				benefits: [],
				exclusions: [],
				documents: [],
				insurers: [],
				familyMembers: [],
				importRegistry: [],
			},
			{ userId: 'user-1', familyMemberId: null, accountOwnerMemberId: null },
		)

		const lifeScore = buildLifeScore({
			metricHistories: [],
			insuranceKnowledge: knowledge,
			documents: [],
		})

		const brief = buildDailyBrief({
			greetingName: 'Alex',
			hasAnyData: true,
			lifeScore,
			attentionItems: [],
			insuranceKnowledge: knowledge,
			expiringDocumentCount: 0,
			healthReportCount: 0,
		})

		expect(brief.tone).toBe('calm')
		expect(brief.paragraphs[0]).toContain('Everything looks good')
	})
})
