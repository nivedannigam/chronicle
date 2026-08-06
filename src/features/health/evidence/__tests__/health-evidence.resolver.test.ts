import { describe, expect, it } from 'vitest'
import { resolveHealthEvidence } from '@/features/health/evidence/health-evidence.resolver'
import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { EvidenceRequest } from '@/shared/ai/evidence-planning/types'

function heartKnowledge(): HealthKnowledge {
	return {
		patient: { userId: 'user-1' },
		familyMember: {
			id: 'member-1',
			displayName: 'Test',
			relationship: 'self',
			isAccountOwner: true,
			dateOfBirth: null,
			gender: null,
		},
		latestReport: {
			id: 'report-2026',
			title: 'Full Body Checkup 2026',
			date: '2026-03-09',
			lab: 'Thyrocare',
			status: 'completed',
			metricCount: 2,
			classifiedCount: 2,
			unknownCount: 0,
			isDisplayReady: true,
			needsReprocess: false,
			badgeStatus: 'normal',
			reportType: 'general',
			parserConfidence: 0.9,
			ocrConfidence: 0.9,
		},
		previousReports: [
			{
				id: 'report-2024',
				title: 'Cardiac Profile 2024',
				date: '2024-06-01',
				lab: 'Thyrocare',
				status: 'completed',
				metricCount: 1,
				classifiedCount: 1,
				unknownCount: 0,
				isDisplayReady: true,
				needsReprocess: false,
				badgeStatus: 'normal',
				reportType: 'cardiac',
				parserConfidence: 0.9,
				ocrConfidence: 0.9,
			},
			{
				id: 'report-tmt',
				title: 'TMT Stress Test',
				date: '2026-01-15',
				lab: 'Apollo',
				status: 'completed',
				metricCount: 0,
				classifiedCount: 0,
				unknownCount: 0,
				isDisplayReady: true,
				needsReprocess: false,
				badgeStatus: 'normal',
				reportType: 'diagnostic',
				parserConfidence: 0.8,
				ocrConfidence: 0.8,
			},
		],
		metrics: [
			{
				id: 'metric-old-ldl',
				canonicalId: 'ldl',
				displayName: 'LDL Cholesterol',
				value: '160',
				unit: 'mg/dL',
				status: 'high',
				categoryId: 'heart',
				observedAt: '2024-06-01T00:00:00.000Z',
				reportId: 'report-2024',
				reportTitle: 'Cardiac Profile 2024',
				referenceRange: '< 100',
				source: 'parser',
				confidence: 0.9,
				validationStatus: 'validated',
				clinicalScore: 120,
				priority: 'high',
				rankingReason: 'abnormal',
				isQualitative: false,
			},
			{
				id: 'metric-new-ldl',
				canonicalId: 'ldl',
				displayName: 'LDL Cholesterol',
				value: '95',
				unit: 'mg/dL',
				status: 'normal',
				categoryId: 'heart',
				observedAt: '2026-03-09T00:00:00.000Z',
				reportId: 'report-2026',
				reportTitle: 'Full Body Checkup 2026',
				referenceRange: '< 100',
				source: 'parser',
				confidence: 0.9,
				validationStatus: 'validated',
				clinicalScore: 40,
				priority: 'low',
				rankingReason: 'normal',
				isQualitative: false,
			},
		],
		abnormalMetrics: [],
		normalMetrics: [],
		criticalMetrics: [],
		borderlineMetrics: [],
		trendAnalysis: [
			{
				metricId: 'ldl',
				displayName: 'LDL Cholesterol',
				direction: 'improving',
				changePercent: -40,
				dataPointCount: 2,
				isActionable: true,
				clinicalScore: 80,
				evidenceIds: ['metric-old-ldl', 'metric-new-ldl'],
			},
		],
		healthScore: 82,
		timeline: [
			{
				id: 'timeline-1',
				type: 'report_imported',
				title: 'Full Body Checkup 2026 imported',
				description: 'Latest report available',
				date: '2026-03-09',
				evidenceIds: ['report-2026'],
				reportId: 'report-2026',
			},
		],
		insights: [],
		recommendations: [],
		confidence: {
			overall: 0.9,
			dataCompleteness: 0.85,
			parserConfidence: 0.9,
			metricCoverage: 0.8,
			reportCount: 3,
			displayReadyCount: 3,
		},
		limitations: [],
		sources: [],
		summary: {
			headline: 'Heart metrics improving',
			lines: ['LDL normalized in latest report'],
			metricCount: 2,
			abnormalCount: 0,
			criticalCount: 0,
			reportCount: 3,
		},
		generatedAt: '2026-03-09T00:00:00.000Z',
		buildDurationMs: 12,
	}
}

describe('resolveHealthEvidence', () => {
	it('returns latest heart metrics and diagnostic reports for STATUS_OVERVIEW', () => {
		const request: EvidenceRequest = {
			questionType: 'STATUS_OVERVIEW',
			domain: 'health',
			subject: { categoryId: 'heart' },
			question: 'How is my heart health?',
		}

		const bundle = resolveHealthEvidence(heartKnowledge(), request)

		expect(bundle.reports.some((report) => report.id === 'report-2026')).toBe(
			true,
		)
		expect(bundle.reports.some((report) => report.title.includes('TMT'))).toBe(
			true,
		)

		const latestLdl = bundle.metrics.find(
			(metric) =>
				metric.canonicalId === 'ldl' && metric.temporalRole === 'latest',
		)
		const previousLdl = bundle.metrics.find(
			(metric) =>
				metric.canonicalId === 'ldl' && metric.temporalRole === 'previous',
		)

		expect(latestLdl?.value).toBe('95')
		expect(latestLdl?.observedAt).toContain('2026')
		expect(previousLdl?.value).toBe('160')

		expect(bundle.trends.length).toBeGreaterThan(0)
		expect(bundle.timeline.length).toBeGreaterThan(0)
	})

	it('prioritizes recent values over historically abnormal cholesterol for TREND', () => {
		const request: EvidenceRequest = {
			questionType: 'TREND',
			domain: 'health',
			subject: { metricIds: ['ldl'], metricNames: ['LDL Cholesterol'] },
			question: 'How has my cholesterol changed?',
		}

		const bundle = resolveHealthEvidence(heartKnowledge(), request)
		const ldlHistory = bundle.metrics.filter(
			(metric) => metric.canonicalId === 'ldl',
		)

		expect(ldlHistory.length).toBeGreaterThan(1)
		expect(ldlHistory[0]?.observedAt).toContain('2026')
		expect(bundle.trends.some((trend) => trend.metricId === 'ldl')).toBe(true)
	})

	it('includes prior report context for LATEST_REPORT', () => {
		const request: EvidenceRequest = {
			questionType: 'LATEST_REPORT',
			domain: 'health',
			subject: {},
			question: 'Explain my latest report',
		}

		const bundle = resolveHealthEvidence(heartKnowledge(), request)

		expect(bundle.reports[0]?.id).toBe('report-2026')
		expect(
			bundle.metrics.every((metric) => metric.reportId === 'report-2026'),
		).toBe(true)
		expect(bundle.reports.some((report) => report.id === 'report-2024')).toBe(
			true,
		)
	})

	it('returns only the requested fact for FACT_LOOKUP', () => {
		const request: EvidenceRequest = {
			questionType: 'FACT_LOOKUP',
			domain: 'health',
			subject: { metricIds: ['ldl'], metricNames: ['LDL'] },
			question: 'What is my LDL?',
		}

		const bundle = resolveHealthEvidence(heartKnowledge(), request)

		expect(bundle.metrics).toHaveLength(1)
		expect(bundle.metrics[0]?.value).toBe('95')
		expect(bundle.metrics[0]?.temporalRole).toBe('latest')
	})
})
