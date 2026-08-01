import type { ConnectorDocumentRecord } from '@/core/connectors'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { listFamilyMembersWithAliases } from '@/features/family/services/family.service'
import { filterReportsForMember } from '@/features/family/utils/member-display'
import { fetchHealthMetricsForUser } from '@/features/health/services/health-metrics.service'
import { fetchUploadedHealthReports } from '@/features/health/services/health-upload.service'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { HealthKnowledgeGetInput } from '@/features/health-knowledge/types/health-knowledge-object.types'

const GOOGLE_DRIVE = 'google-drive'

export interface HealthKnowledgeRawData {
	uploadedReports: UploadedHealthReport[]
	storedMetrics: StoredHealthMetric[]
	familyMembers: FamilyMemberWithAliases[]
	importRegistry: ConnectorDocumentRecord[]
}

export interface HealthKnowledgeDataSource {
	fetchRawData(input: HealthKnowledgeGetInput): Promise<HealthKnowledgeRawData>
}

export class DefaultHealthKnowledgeDataSource implements HealthKnowledgeDataSource {
	async fetchRawData(
		input: HealthKnowledgeGetInput,
	): Promise<HealthKnowledgeRawData> {
		const [uploadedReports, storedMetrics, familyMembers, importRegistry] =
			await Promise.all([
				fetchUploadedHealthReports(),
				fetchHealthMetricsForUser(input.userId, {
					familyMemberId: input.familyMemberId,
					accountOwnerMemberId: input.accountOwnerMemberId,
				}),
				listFamilyMembersWithAliases(input.userId),
				listRegistryRecords(input.userId, GOOGLE_DRIVE).catch(() => []),
			])

		return {
			uploadedReports,
			storedMetrics,
			familyMembers,
			importRegistry,
		}
	}
}

export function filterRawDataForMember(
	raw: HealthKnowledgeRawData,
	input: HealthKnowledgeGetInput,
): {
	reports: UploadedHealthReport[]
	metrics: StoredHealthMetric[]
} {
	const reports =
		input.familyMemberId != null
			? filterReportsForMember(
					raw.uploadedReports,
					input.familyMemberId,
					input.accountOwnerMemberId ?? null,
				)
			: raw.uploadedReports

	const reportIds = new Set(reports.map((report) => report.id))
	const metrics = raw.storedMetrics.filter((metric) =>
		reportIds.has(metric.report_id),
	)

	return { reports, metrics }
}

export const defaultHealthKnowledgeDataSource =
	new DefaultHealthKnowledgeDataSource()
