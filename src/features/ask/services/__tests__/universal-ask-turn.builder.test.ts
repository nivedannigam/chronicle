import { describe, expect, it } from 'vitest'
import { buildStructuredUniversalTurn } from '@/features/ask/services/universal-ask-turn.builder'
import { classifyUniversalQuery } from '@/features/ask/routing/universal-query-router'
import { mergeCrossModuleEvidence } from '@/shared/ai/evidence-planning/cross-module-evidence.adapter'
import type { EvidenceBundle } from '@/shared/ai/evidence-planning/types'

describe('universal ask turn builder', () => {
	it('builds honest coverage answers when data is incomplete', () => {
		const classification = classifyUniversalQuery({
			question: 'Do I have all my insurance?',
		})
		const bundle = mergeCrossModuleEvidence({
			domainBundles: [
				{
					domain: 'insurance',
					bundle: {
						reports: [],
						metrics: [],
						trends: [],
						timeline: [],
						summary: {
							headline: 'Insurance coverage',
							lines: ['Vehicle insurance policy is on file.'],
							healthScore: null,
							limitations: [
								"I found vehicle insurance records, but I don't have enough information to confirm that all your insurance policies are present.",
							],
						},
						metadata: {
							questionType: 'COVERAGE',
							resolver: 'insurance.evidence_resolver.v1',
							excluded: [],
						},
					} satisfies EvidenceBundle,
					entity: 'Insurance',
				},
			],
		})

		const turn = buildStructuredUniversalTurn({
			question: 'Do I have all my insurance?',
			classification,
			bundle,
			memberId: null,
			memberName: null,
			domains: ['insurance'],
		})

		expect(turn.answer).toContain("don't have enough information")
		expect(turn.answer).not.toMatch(/^Yes\./i)
	})

	it('surfaces conflicting evidence instead of silently choosing one', () => {
		const classification = classifyUniversalQuery({
			question: 'What is my home loan balance?',
		})
		const bundle = mergeCrossModuleEvidence({
			domainBundles: [
				{
					domain: 'finance',
					bundle: {
						reports: [],
						metrics: [
							{
								id: 'm1',
								canonicalId: 'loan-balance',
								displayName: 'Outstanding balance',
								value: '₹82,45,000',
								unit: '',
								status: 'normal',
								referenceRange: '',
								observedAt: '2026-07-31',
								reportTitle: 'July 2026 statement',
								categoryId: 'loan',
								reportId: 'r1',
							},
							{
								id: 'm2',
								canonicalId: 'loan-balance',
								displayName: 'Outstanding balance',
								value: '₹81,90,000',
								unit: '',
								status: 'normal',
								referenceRange: '',
								observedAt: '2026-06-30',
								reportTitle: 'June 2026 statement',
								categoryId: 'loan',
								reportId: 'r2',
							},
						],
						trends: [],
						timeline: [],
						summary: {
							headline: 'HDFC Home Loan',
							lines: ['Outstanding balance is ₹82,45,000 as of 31 July 2026.'],
							healthScore: null,
							limitations: [],
						},
						metadata: {
							questionType: 'LATEST_VALUE',
							resolver: 'finance.evidence_resolver.v1',
							excluded: [],
						},
					} satisfies EvidenceBundle,
					entity: 'HDFC Home Loan',
				},
			],
		})

		const turn = buildStructuredUniversalTurn({
			question: 'What is my home loan balance?',
			classification,
			bundle,
			memberId: null,
			memberName: null,
			domains: ['finance'],
		})

		expect(turn.answer).toContain('two different values')
		expect(turn.answer).toContain('statement')
	})

	it('asks for clarification on ambiguous latest balance questions', () => {
		const classification = classifyUniversalQuery({
			question: 'What is my latest balance?',
		})
		const bundle = mergeCrossModuleEvidence({ domainBundles: [] })

		const turn = buildStructuredUniversalTurn({
			question: 'What is my latest balance?',
			classification,
			bundle,
			memberId: null,
			memberName: null,
			domains: ['finance'],
		})

		expect(turn.answer).toContain('Which balance should I check')
		expect(turn.answer).not.toMatch(/₹|\$|USD|INR/)
	})
})
