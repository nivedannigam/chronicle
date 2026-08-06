import { describe, expect, it } from 'vitest'
import {
	assertNoForbiddenLLMFields,
	assertNoForbiddenLLMKeys,
	isForbiddenLLMKey,
} from '@/shared/ai/knowledge/health-knowledge-serializer'
import { buildEvidencePrompt } from '@/shared/ai/prompt/evidence-prompt.builder'
import type { ClassifiedIntent } from '@/shared/ai/intent/intent.types'
import type { EvidenceBundle } from '@/shared/ai/evidence-planning/types'

describe('health-knowledge-serializer forbidden field guard', () => {
	it('allows OCR wording in limitation message values', () => {
		expect(() =>
			assertNoForbiddenLLMKeys({
				evidenceBundle: {
					summary: {
						limitations: [
							'OCR confidence is low for one or more reports.',
							'Lipid profile not found in available reports.',
						],
					},
				},
			}),
		).not.toThrow()
	})

	it('blocks forbidden OCR-related keys', () => {
		expect(isForbiddenLLMKey('extracted_text')).toBe(true)
		expect(isForbiddenLLMKey('ocr_page_count')).toBe(true)
		expect(isForbiddenLLMKey('ocrConfidence')).toBe(true)

		expect(() =>
			assertNoForbiddenLLMKeys({
				report: { extracted_text: 'secret ocr blob' },
			}),
		).toThrow(/forbidden field/i)
	})

	it('buildEvidencePrompt accepts limitations mentioning OCR', () => {
		const evidenceBundle: EvidenceBundle = {
			reports: [
				{
					id: 'r1',
					title: 'Mar 2026 - Full Body Checkup.pdf',
					date: '2026-03-01',
					lab: 'Thyrocare',
					metricCount: 12,
					reportType: 'general',
				},
			],
			metrics: [
				{
					id: 'm1',
					canonicalId: 'ldl',
					displayName: 'LDL',
					value: '110',
					unit: 'mg/dL',
					status: 'normal',
					referenceRange: '< 100',
					observedAt: '2026-03-01T12:00:00.000Z',
					reportId: 'r1',
					reportTitle: 'Mar 2026 - Full Body Checkup',
				},
			],
			trends: [],
			timeline: [],
			summary: {
				headline: 'Health overview',
				lines: [],
				healthScore: 72,
				limitations: ['OCR confidence is low for one or more reports.'],
			},
			metadata: {
				questionType: 'STATUS_OVERVIEW',
				resolver: 'health.evidence_resolver.v1',
				excluded: [],
			},
		}

		const intent: ClassifiedIntent = {
			intent: 'GENERAL_HEALTH_SUMMARY',
			domain: 'health',
			confidence: 0.9,
			metricIds: ['ldl'],
			metricNames: ['LDL'],
			reasons: ['heart question'],
		}

		const evidence = {
			domain: 'health' as const,
			intent: intent.intent,
			question: 'How is my heart?',
			items: [
				{
					id: 'metric-m1',
					type: 'metric',
					label: 'LDL 110 mg/dL',
					data: { canonicalId: 'ldl' },
				},
			],
			metadata: {
				evidenceCount: 1,
				excludedItems: [],
				estimatedTokens: 120,
				contextSizeChars: 400,
				selectedKeys: ['metric-m1'],
			},
		}

		expect(() =>
			buildEvidencePrompt({
				question: 'How is my heart?',
				intent,
				evidence,
				evidenceBundle,
				memberName: 'Nivedan',
			}),
		).not.toThrow()

		const prompt = buildEvidencePrompt({
			question: 'How is my heart?',
			intent,
			evidence,
			evidenceBundle,
		})

		assertNoForbiddenLLMFields(prompt.user)
		expect(prompt.user).toContain('OCR confidence is low')
	})
})
