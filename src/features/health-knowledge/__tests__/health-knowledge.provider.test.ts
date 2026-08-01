import { describe, expect, it } from 'vitest'
import { rankHealthMetrics } from '@/features/health-knowledge/engines/evidence-ranking.engine'
import { HealthKnowledgeProvider } from '@/features/health-knowledge/providers/health-knowledge.provider'
import type { HealthKnowledgeRawData } from '@/features/health-knowledge/providers/health-knowledge-data-source'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'

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
					canonicalId: 'bacteria',
					displayName: 'Bacteria',
					rawName: 'BACTERIA',
					value: 'ABSENT',
					unit: null,
					status: 'normal',
					confidence: 0.8,
				},
			],
			metadata: {
				laboratory: 'Thyrocare',
				reportDate: '2026-03-09',
				parserConfidence: 0.88,
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

function rawData(
	overrides: Partial<HealthKnowledgeRawData> = {},
): HealthKnowledgeRawData {
	return {
		uploadedReports: [report()],
		storedMetrics: [storedMetric()],
		familyMembers: [member()],
		importRegistry: [],
		...overrides,
	}
}

describe('HealthKnowledgeProvider', () => {
	const provider = new HealthKnowledgeProvider({
		fetchRawData: async () => rawData(),
	})

	it('builds valid knowledge for a single report', () => {
		const knowledge = provider.buildFromRawData(rawData(), {
			userId: USER_ID,
			familyMemberId: MEMBER_ID,
			accountOwnerMemberId: MEMBER_ID,
		})

		expect(knowledge.patient.userId).toBe(USER_ID)
		expect(knowledge.familyMember.displayName).toBe('Nivedan')
		expect(knowledge.latestReport?.id).toBe('report-1')
		expect(knowledge.metrics.length).toBeGreaterThan(0)
		expect(knowledge.summary.metricCount).toBeGreaterThan(0)
		expect(
			knowledge.summary.lines.some((line) =>
				/Latest report imported/i.test(line),
			),
		).toBe(true)
		expect(knowledge.confidence.overall).toBeGreaterThan(0)
		expect(knowledge.generatedAt).toBeTruthy()
		expect(knowledge.buildDurationMs).toBeGreaterThanOrEqual(0)
	})

	it('handles multiple reports with trend analysis', () => {
		const knowledge = provider.buildFromRawData(
			rawData({
				uploadedReports: [
					report({
						id: 'report-old',
						report_date: '2025-01-01',
						uploaded_at: '2025-01-01T00:00:00.000Z',
						parsed_data: {
							metrics: [
								{
									canonicalId: 'ldl',
									displayName: 'LDL Cholesterol',
									rawName: 'LDL',
									value: '130',
									unit: 'mg/dL',
									status: 'high',
									confidence: 0.9,
								},
							],
							metadata: {
								laboratory: 'Thyrocare',
								reportDate: '2025-01-01',
							},
						},
					}),
					report({
						id: 'report-new',
						report_date: '2026-03-09',
						uploaded_at: '2026-03-09T00:00:00.000Z',
					}),
				],
				storedMetrics: [
					storedMetric({
						id: 'metric-old',
						report_id: 'report-old',
						value: '130',
						status: 'high',
						observed_at: '2025-01-01T00:00:00.000Z',
					}),
					storedMetric({
						id: 'metric-new',
						report_id: 'report-new',
						value: '110',
						status: 'normal',
						observed_at: '2026-03-09T00:00:00.000Z',
					}),
				],
			}),
			{
				userId: USER_ID,
				familyMemberId: MEMBER_ID,
				accountOwnerMemberId: MEMBER_ID,
			},
		)

		expect(knowledge.previousReports.length).toBeGreaterThan(0)
		expect(knowledge.abnormalMetrics.length).toBeGreaterThanOrEqual(0)
		expect(knowledge.timeline.length).toBeGreaterThan(0)
		expect(
			knowledge.limitations.some(
				(item) => item.code === 'no_previous_comparison',
			) === false || knowledge.trendAnalysis.length > 0,
		).toBe(true)
	})

	it('produces valid empty knowledge when no reports exist', () => {
		const knowledge = provider.buildFromRawData(
			rawData({ uploadedReports: [], storedMetrics: [] }),
			{
				userId: USER_ID,
				familyMemberId: MEMBER_ID,
				accountOwnerMemberId: MEMBER_ID,
			},
		)

		expect(knowledge.latestReport).toBeNull()
		expect(knowledge.metrics).toHaveLength(0)
		expect(knowledge.healthScore).toBeNull()
		expect(
			knowledge.limitations.some((item) => item.code === 'no_reports'),
		).toBe(true)
		expect(knowledge.summary.headline).toContain('No health reports')
	})

	it('handles partial reports with structured limitations', () => {
		const knowledge = provider.buildFromRawData(
			rawData({
				uploadedReports: [
					report({
						parsed_data: {
							metrics: [
								{
									canonicalId: 'ldl',
									displayName: 'LDL',
									rawName: 'LDL',
									value: '110',
									status: 'normal',
								},
								{
									canonicalId: 'unknown-marker',
									displayName: 'Unknown Marker',
									rawName: 'Unknown',
									value: '?',
									status: 'unknown',
								},
							],
							metadata: { laboratory: 'Thyrocare', reportDate: '2026-03-09' },
						},
					}),
				],
			}),
			{
				userId: USER_ID,
				familyMemberId: MEMBER_ID,
				accountOwnerMemberId: MEMBER_ID,
			},
		)

		expect(
			knowledge.limitations.some((item) => item.code === 'partial_report'),
		).toBe(true)
		expect(knowledge.latestReport?.badgeStatus).toBe('partial')
	})

	it('handles parser failure / failed report status', () => {
		const knowledge = provider.buildFromRawData(
			rawData({
				uploadedReports: [
					report({
						id: 'failed-report',
						status: 'failed',
						parsed_data: null,
					}),
				],
				storedMetrics: [],
			}),
			{
				userId: USER_ID,
				familyMemberId: MEMBER_ID,
				accountOwnerMemberId: MEMBER_ID,
			},
		)

		expect(knowledge.metrics).toHaveLength(0)
		expect(
			knowledge.limitations.some((item) => item.code === 'no_reports'),
		).toBe(true)
	})

	it('handles missing metrics on completed report', () => {
		const knowledge = provider.buildFromRawData(
			rawData({
				uploadedReports: [
					report({
						parsed_data: {
							metrics: [],
							metadata: {
								laboratory: 'Thyrocare',
								reportDate: '2026-03-09',
								reportType: 'health_summary',
							},
						},
					}),
				],
				storedMetrics: [],
			}),
			{
				userId: USER_ID,
				familyMemberId: MEMBER_ID,
				accountOwnerMemberId: MEMBER_ID,
			},
		)

		expect(knowledge.metrics).toHaveLength(0)
		expect(knowledge.latestReport?.isDisplayReady).toBe(true)
		expect(
			knowledge.limitations.some((item) => item.code === 'single_report'),
		).toBe(true)
	})

	it('deprioritizes urine microscopy in ranking', () => {
		const ranked = rankHealthMetrics([
			{
				id: '1',
				canonicalId: 'bacteria',
				displayName: 'Bacteria',
				value: 'ABSENT',
				unit: null,
				status: 'normal',
				categoryId: 'urine',
				observedAt: '2026-03-09',
				reportId: 'report-1',
				reportTitle: 'Report',
				referenceRange: '',
				source: 'parser',
				confidence: 0.9,
				validationStatus: 'validated',
			},
			{
				id: '2',
				canonicalId: 'ldl',
				displayName: 'LDL Cholesterol',
				value: '160',
				unit: 'mg/dL',
				status: 'high',
				categoryId: 'heart',
				observedAt: '2026-03-09',
				reportId: 'report-1',
				reportTitle: 'Report',
				referenceRange: '< 100',
				source: 'parser',
				confidence: 0.9,
				validationStatus: 'validated',
			},
		])

		expect(ranked[0]?.canonicalId).toBe('ldl')
		expect(ranked[0]?.clinicalScore).toBeGreaterThan(
			ranked[1]?.clinicalScore ?? 0,
		)
	})

	it('includes confidence metadata on every metric', () => {
		const knowledge = provider.buildFromRawData(rawData(), {
			userId: USER_ID,
			familyMemberId: MEMBER_ID,
			accountOwnerMemberId: MEMBER_ID,
		})

		for (const metric of knowledge.metrics) {
			expect(metric.source).toBeTruthy()
			expect(metric.confidence).toBeGreaterThan(0)
			expect(metric.validationStatus).toBeTruthy()
			expect(metric.reportId).toBeTruthy()
		}
	})

	it('generates timeline events with evidence references', () => {
		const knowledge = provider.buildFromRawData(
			rawData({
				uploadedReports: [
					report({
						parsed_data: {
							metrics: [
								{
									canonicalId: 'creatinine',
									displayName: 'Creatinine',
									rawName: 'Creatinine',
									value: '2.1',
									unit: 'mg/dL',
									status: 'critical',
									confidence: 0.95,
								},
							],
							metadata: {
								laboratory: 'Thyrocare',
								reportDate: '2026-03-09',
							},
						},
					}),
				],
				storedMetrics: [
					storedMetric({
						canonical_metric_id: 'creatinine',
						display_name: 'Creatinine',
						value: '2.1',
						status: 'critical',
					}),
				],
			}),
			{
				userId: USER_ID,
				familyMemberId: MEMBER_ID,
				accountOwnerMemberId: MEMBER_ID,
			},
		)

		const criticalEvent = knowledge.timeline.find(
			(event) => event.type === 'metric_critical',
		)

		expect(criticalEvent).toBeTruthy()
		expect(criticalEvent?.evidenceIds.length).toBeGreaterThan(0)
		expect(knowledge.criticalMetrics.length).toBe(1)
		expect(
			knowledge.summary.lines.some((line) => /critical marker/i.test(line)),
		).toBe(true)
	})

	it('getKnowledge resolves via injected data source', async () => {
		const asyncProvider = new HealthKnowledgeProvider({
			fetchRawData: async () => rawData(),
		})

		const knowledge = await asyncProvider.getKnowledge({
			userId: USER_ID,
			familyMemberId: MEMBER_ID,
			accountOwnerMemberId: MEMBER_ID,
		})

		expect(knowledge.metrics.length).toBeGreaterThan(0)
	})
})
