import { describe, expect, it } from 'vitest'
import {
	detectEvidenceConflicts,
	evidenceBundleToCrossModuleItems,
	formatEvidenceCitations,
	mergeCrossModuleEvidence,
} from '@/shared/ai/evidence-planning/cross-module-evidence.adapter'
import type { EvidenceBundle } from '@/shared/ai/evidence-planning/types'

function createBundle(overrides: Partial<EvidenceBundle> = {}): EvidenceBundle {
	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: 'HDFC Home Loan',
			lines: ['Outstanding balance is ₹82,45,000 as of 31 July 2026.'],
			healthScore: null,
			limitations: [],
		},
		metadata: {
			questionType: 'FACT_LOOKUP',
			resolver: 'test.resolver',
			excluded: [],
		},
		...overrides,
	}
}

describe('cross-module evidence adapter', () => {
	it('merges domain bundles into a unified evidence contract', () => {
		const merged = mergeCrossModuleEvidence({
			domainBundles: [
				{
					domain: 'finance',
					bundle: createBundle(),
					entity: 'HDFC Home Loan',
				},
				{
					domain: 'property',
					bundle: createBundle({
						summary: {
							headline: 'Pune Home',
							lines: ['Purchased on 12 March 2021.'],
							healthScore: null,
							limitations: [],
						},
					}),
					entity: 'Pune Home',
				},
			],
		})

		expect(merged.items.length).toBeGreaterThan(1)
		expect(merged.summaryLines.join(' ')).toContain('March 2021')
	})

	it('detects conflicting values with dates and sources', () => {
		const items = evidenceBundleToCrossModuleItems({
			domain: 'finance',
			bundle: createBundle({
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
			}),
			defaultEntity: 'HDFC Home Loan',
		})

		const conflicts = detectEvidenceConflicts(items)

		expect(conflicts.length).toBe(1)
		expect(conflicts[0]?.items.length).toBe(2)
	})

	it('formats calm citations without technical ids', () => {
		const citations = formatEvidenceCitations([
			{
				module: 'finance',
				entity: 'HDFC Home Loan',
				fact: 'Outstanding balance',
				value: '₹82,45,000',
				observedAt: '31 July 2026',
				sourceDocument: 'July 2026 statement',
				confidence: 'high',
				scope: null,
				provenance: 'Finance knowledge',
			},
		])

		expect(citations[0]).toContain('HDFC Home Loan')
		expect(citations[0]).toContain('July 2026 statement')
		expect(citations[0]).not.toMatch(/uuid|registry|embedding/i)
	})
})
