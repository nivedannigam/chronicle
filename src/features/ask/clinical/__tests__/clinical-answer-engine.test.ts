import { describe, expect, it } from 'vitest'
import {
	buildClinicalAnswer,
	clinicalAnswerToProse,
} from '@/features/ask/clinical/clinical-reasoning.engine'
import {
	rankEvidence,
	selectImportantMetrics,
} from '@/features/ask/clinical/evidence-ranking.engine'
import { buildClinicalCards } from '@/features/ask/clinical/clinical-response.builder'
import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'

function sampleKnowledge(
	overrides: Partial<RetrievedKnowledge> = {},
): RetrievedKnowledge {
	return {
		domain: 'health',
		intent: 'general_health',
		reports: [
			{
				id: 'report-1',
				title: 'Health Checkup Report',
				date: '2026-03-09T06:30:00+00:00',
				lab: 'Thyrocare',
				category: 'lab',
				summary: 'Full panel',
			},
		],
		metrics: [
			{
				canonicalId: 'bacteria',
				displayName: 'BACTERIA',
				latestValue: 'ABSENT',
				unit: null,
				status: 'normal',
				referenceRange: 'ABSENT',
				trend: 'unknown',
				categoryId: 'general',
				reportId: 'report-1',
				reportTitle: 'Health Checkup Report',
				observedAt: '2026-03-09T06:30:00+00:00',
			},
			{
				canonicalId: 'ldl',
				displayName: 'LDL Cholesterol',
				latestValue: '110',
				unit: 'mg/dL',
				status: 'normal',
				referenceRange: '< 100',
				trend: 'unknown',
				categoryId: 'heart',
				reportId: 'report-1',
				reportTitle: 'Health Checkup Report',
				observedAt: '2026-03-09T06:30:00+00:00',
			},
			{
				canonicalId: 'hba1c',
				displayName: 'HbA1c',
				latestValue: '5.8',
				unit: '%',
				status: 'borderline',
				referenceRange: '< 5.7',
				trend: 'unknown',
				categoryId: 'diabetes',
				reportId: 'report-1',
				reportTitle: 'Health Checkup Report',
				observedAt: '2026-03-09T06:30:00+00:00',
			},
		],
		timelines: [],
		trends: [
			{
				metricId: 'bacteria',
				displayName: 'BACTERIA',
				direction: 'unknown',
				changePercent: '—',
				dataPointCount: 1,
				latestValue: 'ABSENT',
			},
		],
		observations: [],
		relationships: [],
		insights: [],
		alerts: [],
		summaryLines: [],
		comparisons: [],
		...overrides,
	}
}

describe('evidence-ranking.engine', () => {
	it('prioritizes abnormal and key biomarkers over urine microscopy', () => {
		const ranked = rankEvidence(sampleKnowledge())
		const important = selectImportantMetrics(ranked, 3)

		expect(important[0]?.canonicalId).toBe('hba1c')
		expect(important.some((metric) => metric.canonicalId === 'bacteria')).toBe(
			false,
		)
	})

	it('filters non-actionable trends', () => {
		const ranked = rankEvidence(sampleKnowledge())

		expect(ranked.trends).toHaveLength(0)
		expect(ranked.singleReport).toBe(true)
	})
})

describe('clinical-reasoning.engine', () => {
	it('uses single-report language for general health', () => {
		const answer = buildClinicalAnswer({
			knowledge: sampleKnowledge(),
			question: 'How is my health?',
			dataAvailable: true,
		})

		expect(answer.executiveSummary).toContain('latest available report')
		expect(answer.executiveSummary).not.toContain('stable across')
		expect(answer.showTrendCards).toBe(false)
	})

	it('surfaces borderline markers in key findings', () => {
		const answer = buildClinicalAnswer({
			knowledge: sampleKnowledge(),
			question: 'How is my health?',
			dataAvailable: true,
		})

		expect(answer.keyFindings.some((line) => /HbA1c/i.test(line))).toBe(true)
		expect(answer.keyFindings.some((line) => /BACTERIA/i.test(line))).toBe(
			false,
		)
	})

	it('does not add single-report limitation for general summary', () => {
		const answer = buildClinicalAnswer({
			knowledge: sampleKnowledge(),
			question: 'How is my health?',
			dataAvailable: true,
		})

		expect(
			answer.limitations.some((line) => /only one report/i.test(line)),
		).toBe(false)
	})

	it('adds trend limitation when asking about trends with one report', () => {
		const answer = buildClinicalAnswer({
			knowledge: sampleKnowledge({ intent: 'metric_trend' }),
			question: 'Show me my cholesterol trend',
			dataAvailable: true,
		})

		expect(answer.executiveSummary).toContain("isn't enough historical data")
	})
})

describe('clinical-response.builder', () => {
	it('does not emit meaningless trend summary cards', () => {
		const clinical = buildClinicalAnswer({
			knowledge: sampleKnowledge(),
			question: 'How is my health?',
			dataAvailable: true,
		})
		const cards = buildClinicalCards(clinical, sampleKnowledge())

		expect(cards.some((card) => card.id.startsWith('trend-summary-'))).toBe(
			false,
		)
		expect(
			cards.filter((card) => card.type === 'metric').length,
		).toBeGreaterThan(0)
	})
})

describe('clinicalAnswerToProse', () => {
	it('joins executive summary and key findings', () => {
		const answer = buildClinicalAnswer({
			knowledge: sampleKnowledge(),
			question: 'How is my health?',
			dataAvailable: true,
		})
		const prose = clinicalAnswerToProse(answer)

		expect(prose).toContain('latest available report')
		expect(prose).toContain('not medical advice')
	})
})
