import { HealthKnowledgeProvider } from '@/features/health-knowledge/providers/health-knowledge.provider'
import type { HealthKnowledgeRawData } from '@/features/health-knowledge/providers/health-knowledge-data-source'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { ToolContext } from '@/shared/ai/tools/tool.types'
import { createToolContext } from '@/shared/ai/tools/tool-permissions'

export const USER_ID = 'user-test-1'
export const MEMBER_ID = 'member-owner'

export function member(): FamilyMemberWithAliases {
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

export function report(
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
			],
			metadata: {
				laboratory: 'Thyrocare',
				reportDate: '2026-03-09',
			},
		},
		...overrides,
	} as UploadedHealthReport
}

export function storedMetric(
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

export function buildKnowledge(
	overrides: Partial<HealthKnowledgeRawData> = {},
): HealthKnowledge {
	const provider = new HealthKnowledgeProvider({
		fetchRawData: async () => ({
			uploadedReports: [report()],
			storedMetrics: [storedMetric()],
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

export function buildToolContext(
	knowledge: HealthKnowledge,
	overrides: Partial<ToolContext> = {},
): ToolContext {
	return createToolContext({
		userId: USER_ID,
		familyMemberId: MEMBER_ID,
		accountOwnerMemberId: MEMBER_ID,
		memberName: 'Nivedan',
		question: overrides.question ?? 'Test question',
		intent: overrides.intent ?? 'LATEST_REPORT',
		knowledge,
		metricIds: overrides.metricIds,
		metricNames: overrides.metricNames,
		...overrides,
	})
}
