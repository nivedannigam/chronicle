import { describe, expect, it } from 'vitest'
import { HealthKnowledgeProvider } from '@/features/health-knowledge/providers/health-knowledge.provider'
import type { HealthKnowledgeRawData } from '@/features/health-knowledge/providers/health-knowledge-data-source'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'
import { healthEvidenceSelector } from '@/shared/ai/evidence/health-evidence-selector'
import { healthIntentClassifier } from '@/shared/ai/intent/health-intent-classifier'

const USER_ID = 'user-test-1'
const MEMBER_ID = 'member-owner'

function member(): FamilyMemberWithAliases {
	return {
		id: MEMBER_ID,
		userId: USER_ID,
		familyId: 'family-1',
		displayName: 'Nivedan',
		relationship: 'self',
		isAccountOwner: true,
		roleId: 'owner',
		dateOfBirth: '1990-01-01',
		gender: 'male',
		status: 'active',
		avatarUrl: null,
		sortOrder: 0,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		aliases: [],
	}
}

function report(
	overrides: Partial<UploadedHealthReport> = {},
): UploadedHealthReport {
	return {
		id: 'report-1',
		user_id: USER_ID,
		family_member_id: MEMBER_ID,
		file_name: 'Thyrocare.pdf',
		storage_path: 'path',
		report_date: '2026-03-09',
		report_type: 'general',
		status: 'completed',
		uploaded_at: '2026-03-09T00:00:00.000Z',
		parsed_data: {
			metrics: [
				{
					canonicalId: 'ldl',
					displayName: 'LDL Cholesterol',
					rawName: 'LDL',
					value: '110',
					unit: 'mg/dL',
					status: 'normal',
					confidence: 0.92,
				},
				{
					canonicalId: 'hba1c',
					displayName: 'HbA1c',
					rawName: 'HbA1c',
					value: '5.8',
					unit: '%',
					status: 'borderline',
					confidence: 0.9,
				},
				{
					canonicalId: 'hdl',
					displayName: 'HDL Cholesterol',
					rawName: 'HDL',
					value: '45',
					unit: 'mg/dL',
					status: 'normal',
					confidence: 0.9,
				},
			],
			metadata: {
				laboratory: 'Thyrocare',
				reportDate: '2026-03-09',
			},
		},
		...overrides,
	} as UploadedHealthReport
}

function storedMetric(
	overrides: Partial<StoredHealthMetric> = {},
): StoredHealthMetric {
	return {
		id: 'metric-1',
		user_id: USER_ID,
		family_member_id: MEMBER_ID,
		report_id: 'report-1',
		workflow_item_id: null,
		canonical_metric_id: 'ldl',
		display_name: 'LDL Cholesterol',
		raw_name: 'LDL',
		value: '110',
		numeric_value: 110,
		unit: 'mg/dL',
		reference_range_raw: '< 100',
		reference_lower: null,
		reference_upper: 100,
		status: 'normal',
		category: 'heart',
		report_date: '2026-03-09',
		observed_at: '2026-03-09T00:00:00.000Z',
		confidence: 0.92,
		source: 'parser',
		created_at: '2026-03-09T00:00:00.000Z',
		...overrides,
	}
}

function buildKnowledge(overrides: Partial<HealthKnowledgeRawData> = {}) {
	const provider = new HealthKnowledgeProvider({
		fetchRawData: async () => ({
			uploadedReports: [report()],
			storedMetrics: [
				storedMetric(),
				storedMetric({
					id: 'metric-hba1c',
					canonical_metric_id: 'hba1c',
					display_name: 'HbA1c',
					value: '5.8',
					numeric_value: 5.8,
					unit: '%',
					status: 'borderline',
				}),
			],
			familyMembers: [member()],
			importRegistry: [],
			...overrides,
		}),
	})

	return provider.buildFromRawData(
		{
			uploadedReports: overrides.uploadedReports ?? [report()],
			storedMetrics: overrides.storedMetrics ?? [storedMetric()],
			familyMembers: overrides.familyMembers ?? [member()],
			importRegistry: overrides.importRegistry ?? [],
		},
		{
			userId: USER_ID,
			familyMemberId: MEMBER_ID,
			accountOwnerMemberId: MEMBER_ID,
		},
	)
}

function selectForQuestion(question: string) {
	const knowledge = buildKnowledge()
	const classified = healthIntentClassifier.classify(question)

	return {
		classified,
		evidence: healthEvidenceSelector.select({
			knowledge,
			intent: classified.intent,
			question,
			metricIds: classified.metricIds,
			metricNames: classified.metricNames,
			timeRangeYears: classified.timeRangeYears,
		}),
		knowledge,
	}
}

describe('HealthEvidenceSelector', () => {
	it('selects latest report evidence for summarize latest report', () => {
		const { evidence } = selectForQuestion('Summarize my latest health report')

		expect(evidence.metadata.excludedItems).toContain('previousReports')
		expect(evidence.items.some((item) => item.type === 'health_report')).toBe(
			true,
		)
		expect(evidence.items.some((item) => item.type === 'health_summary')).toBe(
			true,
		)
		expect(evidence.metadata.evidenceCount).toBeGreaterThan(0)
		expect(evidence.metadata.estimatedTokens).toBeGreaterThan(0)
	})

	it('selects general summary with top findings only', () => {
		const { evidence } = selectForQuestion('How is my health overall?')

		expect(evidence.intent).toBe('GENERAL_HEALTH_SUMMARY')
		expect(evidence.metadata.excludedItems).toContain('allMetrics')
		expect(evidence.items.some((item) => item.type === 'confidence')).toBe(true)
	})

	it('selects only cholesterol metrics for cholesterol question', () => {
		const { evidence } = selectForQuestion('How is my cholesterol?')

		expect(evidence.intent).toBe('SPECIFIC_METRIC')

		const metricItems = evidence.items.filter(
			(item) => item.type === 'health_metric',
		)
		expect(metricItems.length).toBeGreaterThan(0)
		expect(metricItems.length).toBeLessThanOrEqual(4)

		for (const item of metricItems) {
			const name = String(item.data.displayName ?? '').toLowerCase()
			expect(
				name.includes('ldl') ||
					name.includes('hdl') ||
					name.includes('cholesterol') ||
					name.includes('triglyceride'),
			).toBe(true)
		}

		expect(evidence.metadata.excludedItems).toContain('unrelatedMetrics')
	})

	it('selects HbA1c evidence for explain HbA1c', () => {
		const { evidence } = selectForQuestion('Explain my HbA1c result')

		expect(evidence.intent).toBe('EXPLAIN_METRIC')
		expect(
			evidence.items.some(
				(item) =>
					item.type === 'health_metric' &&
					String(item.data.displayName).includes('HbA1c'),
			),
		).toBe(true)
	})

	it('selects LDL evidence for explain LDL', () => {
		const { evidence } = selectForQuestion('What does LDL mean?')

		expect(evidence.intent).toBe('EXPLAIN_METRIC')
		expect(
			evidence.items.some(
				(item) =>
					item.type === 'health_metric' &&
					String(item.data.displayName).toLowerCase().includes('ldl'),
			),
		).toBe(true)
	})

	it('selects abnormal metrics and recommendations', () => {
		const knowledge = buildKnowledge({
			storedMetrics: [
				storedMetric({ status: 'high', value: '160' }),
				storedMetric({
					id: 'metric-hba1c',
					canonical_metric_id: 'hba1c',
					display_name: 'HbA1c',
					value: '6.4',
					status: 'high',
				}),
			],
		})

		const classified = healthIntentClassifier.classify('Show abnormal results')
		const evidence = healthEvidenceSelector.select({
			knowledge,
			intent: classified.intent,
			question: 'Show abnormal results',
		})

		expect(evidence.intent).toBe('ABNORMAL_RESULTS')
		expect(
			evidence.items.filter((item) => item.type === 'health_metric').length,
		).toBeGreaterThan(0)
		expect(evidence.metadata.excludedItems).toContain('normalMetrics')
	})

	it('selects comparable reports for compare question', () => {
		const knowledge = buildKnowledge({
			uploadedReports: [
				report({
					id: 'report-old',
					report_date: '2025-01-01',
					uploaded_at: '2025-01-01T00:00:00.000Z',
				}),
				report({ id: 'report-new', report_date: '2026-03-09' }),
			],
			storedMetrics: [
				storedMetric({
					report_id: 'report-old',
					observed_at: '2025-01-01T00:00:00.000Z',
				}),
				storedMetric({
					id: 'metric-new',
					report_id: 'report-new',
					observed_at: '2026-03-09T00:00:00.000Z',
				}),
			],
		})

		const classified = healthIntentClassifier.classify(
			'What changed since last year?',
		)
		const evidence = healthEvidenceSelector.select({
			knowledge,
			intent: classified.intent,
			question: 'What changed since last year?',
			timeRangeYears: classified.timeRangeYears,
		})

		expect(evidence.intent).toBe('COMPARE_REPORTS')
		expect(
			evidence.items.filter((item) => item.type === 'health_report').length,
		).toBeGreaterThan(0)
		expect(evidence.metadata.excludedItems).toContain('normalMetrics')
	})

	it('selects minimal evidence for unknown question', () => {
		const { evidence } = selectForQuestion('What is the weather today?')

		expect(evidence.intent).toBe('UNKNOWN')
		expect(evidence.metadata.excludedItems).toContain('fullKnowledgeGraph')
		expect(evidence.metadata.evidenceCount).toBeLessThanOrEqual(3)
	})
})
