import { describe, expect, it } from 'vitest'
import {
	computeTrustConfidence,
	detectReportDisagreements,
} from '@/features/ask/trust/disagreement-detector'
import { buildTrustResponse } from '@/features/ask/trust/trust-response.builder'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'

function emptyKnowledge(
	overrides: Partial<RetrievedKnowledge> = {},
): RetrievedKnowledge {
	return {
		domain: 'health',
		intent: 'general_health',
		reports: [],
		metrics: [],
		timelines: [],
		trends: [],
		observations: [],
		relationships: [],
		insights: [],
		alerts: [],
		summaryLines: [],
		comparisons: [],
		...overrides,
	}
}

describe('trust confidence', () => {
	it('returns low confidence when no data is available', () => {
		const result = computeTrustConfidence({
			dataAvailable: false,
			reportCount: 0,
			metricCount: 0,
			evidenceItemCount: 0,
			disagreementCount: 0,
			hasStructuredMetrics: false,
			hasOcrEvidence: false,
		})

		expect(result.level).toBe('low')
		expect(result.factors[0]).toContain('No matching records')
	})

	it('reduces confidence when disagreements exist', () => {
		const withDisagreement = computeTrustConfidence({
			dataAvailable: true,
			reportCount: 2,
			metricCount: 2,
			evidenceItemCount: 2,
			disagreementCount: 2,
			hasStructuredMetrics: true,
			hasOcrEvidence: false,
		})

		const without = computeTrustConfidence({
			dataAvailable: true,
			reportCount: 2,
			metricCount: 2,
			evidenceItemCount: 2,
			disagreementCount: 0,
			hasStructuredMetrics: true,
			hasOcrEvidence: false,
		})

		expect(withDisagreement.score).toBeLessThan(without.score)
	})
})

describe('disagreement detection', () => {
	it('surfaces conflicting LDL values across reports', () => {
		const knowledge = emptyKnowledge({
			observations: [
				{
					id: 'o1',
					metricId: 'ldl',
					displayName: 'LDL',
					value: '160',
					status: 'high',
					observedAt: '2024-01-01',
					reportId: 'r1',
					reportTitle: 'Lipid 2024',
					referenceRange: '<100',
				},
				{
					id: 'o2',
					metricId: 'ldl',
					displayName: 'LDL',
					value: '120',
					status: 'normal',
					observedAt: '2026-01-01',
					reportId: 'r2',
					reportTitle: 'Lipid 2026',
					referenceRange: '<100',
				},
			],
		})

		const disagreements = detectReportDisagreements(knowledge)

		expect(disagreements).toHaveLength(1)
		expect(disagreements[0]?.values).toHaveLength(2)
		expect(disagreements[0]?.explanation).toContain(
			'rather than choosing one silently',
		)
	})
})

describe('trust response builder', () => {
	it('includes missing information when no reports match', () => {
		const trust = buildTrustResponse({
			answer: 'I do not have that information yet.',
			question: 'What is my LDL?',
			knowledge: emptyKnowledge(),
			dataAvailable: false,
			evidence: [],
			citations: [],
			relatedReports: [],
			relatedMetrics: [],
			followUpQuestions: [],
		})

		expect(trust.missingInformation.length).toBeGreaterThan(0)
		expect(trust.confidence.level).toBe('low')
	})

	it('builds evidence items from multiple reports', () => {
		const trust = buildTrustResponse({
			answer: 'Your LDL is 120.',
			question: 'What is my LDL?',
			knowledge: emptyKnowledge({
				reports: [
					{
						id: 'r1',
						title: 'Lipid Panel',
						date: '2026-01-01',
						lab: 'Apollo',
						category: 'heart',
						summary: 'Lipid report',
					},
				],
				metrics: [
					{
						canonicalId: 'ldl',
						displayName: 'LDL',
						latestValue: '120',
						unit: 'mg/dL',
						status: 'normal',
						referenceRange: '<100',
						trend: 'stable',
						categoryId: 'heart',
						reportId: 'r1',
						reportTitle: 'Lipid Panel',
						observedAt: '2026-01-01',
					},
				],
			}),
			dataAvailable: true,
			evidence: ['LDL: 120'],
			citations: [],
			relatedReports: [{ id: 'r1', title: 'Lipid Panel', date: '2026-01-01' }],
			relatedMetrics: [{ name: 'LDL', value: '120', status: 'normal' }],
			followUpQuestions: ['Explain LDL.'],
			uploadedReports: [
				{
					id: 'r1',
					extracted_text: 'LDL Cholesterol 120 mg/dL within range',
				} as import('@/features/health/types').UploadedHealthReport,
			],
		})

		expect(trust.evidenceItems.length).toBeGreaterThan(0)
		expect(trust.evidenceItems.some((item) => item.ocrExcerpt)).toBe(true)
		expect(trust.explainabilityPrompts.length).toBe(4)
	})
})

describe('poor OCR scenario', () => {
	it('uses structured metrics as known facts without OCR', () => {
		const trust = buildTrustResponse({
			answer: 'Hemoglobin is 13.5 g/dL.',
			question: 'What is my hemoglobin?',
			knowledge: emptyKnowledge({
				metrics: [
					{
						canonicalId: 'hemoglobin',
						displayName: 'Hemoglobin',
						latestValue: '13.5',
						unit: 'g/dL',
						status: 'normal',
						referenceRange: '12-16',
						trend: 'stable',
						categoryId: 'blood',
						reportId: 'r1',
						reportTitle: 'CBC',
						observedAt: '2026-01-01',
					},
				],
				reports: [
					{
						id: 'r1',
						title: 'CBC',
						date: '2026-01-01',
						lab: 'Lab',
						category: 'blood',
						summary: 'CBC',
					},
				],
			}),
			dataAvailable: true,
			evidence: [],
			citations: [],
			relatedReports: [],
			relatedMetrics: [],
			followUpQuestions: [],
			uploadedReports: [
				{
					id: 'r1',
					extracted_text: '',
				} as import('@/features/health/types').UploadedHealthReport,
			],
		})

		expect(trust.evidenceItems[0]?.claimKind).toBe('known_fact')
		expect(trust.evidenceItems[0]?.ocrExcerpt).toBeUndefined()
	})
})
