import type { ConnectorDocumentRecord } from '@/core/connectors'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { listFamilyMembersWithAliases } from '@/features/family/services/family.service'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { InsuranceKnowledgeGetInput } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceKnowledgeRawRecords } from '@/features/insurance-knowledge/types/insurance-record.types'

const GOOGLE_DRIVE = 'google-drive'

export interface InsuranceKnowledgeRawData extends InsuranceKnowledgeRawRecords {
	familyMembers: FamilyMemberWithAliases[]
	importRegistry: ConnectorDocumentRecord[]
}

export interface InsuranceKnowledgeDataSource {
	fetchRawData(
		input: InsuranceKnowledgeGetInput,
	): Promise<InsuranceKnowledgeRawData>
}

/**
 * Default data source — returns empty insurance records until DB/import layer exists.
 * The knowledge provider still builds a valid empty InsuranceKnowledge object.
 */
export class DefaultInsuranceKnowledgeDataSource implements InsuranceKnowledgeDataSource {
	async fetchRawData(
		input: InsuranceKnowledgeGetInput,
	): Promise<InsuranceKnowledgeRawData> {
		const [familyMembers, importRegistry] = await Promise.all([
			listFamilyMembersWithAliases(input.userId),
			listRegistryRecords(input.userId, GOOGLE_DRIVE).catch(() => []),
		])

		return {
			policies: [],
			coverages: [],
			members: [],
			nominees: [],
			premiums: [],
			renewals: [],
			claims: [],
			benefits: [],
			exclusions: [],
			documents: [],
			insurers: [],
			familyMembers,
			importRegistry,
		}
	}
}

export function filterRawDataForMember(
	raw: InsuranceKnowledgeRawData,
	input: InsuranceKnowledgeGetInput,
): InsuranceKnowledgeRawRecords {
	if (input.familyMemberId == null) {
		return raw
	}

	const memberId = input.familyMemberId
	const accountOwnerId = input.accountOwnerMemberId ?? null

	const matchesMember = <T extends { familyMemberId: string | null }>(
		record: T,
	): boolean => {
		if (record.familyMemberId === memberId) {
			return true
		}

		if (record.familyMemberId == null && memberId === accountOwnerId) {
			return true
		}

		return false
	}

	const policies = raw.policies.filter(matchesMember)
	const policyIds = new Set(policies.map((policy) => policy.id))

	return {
		policies,
		coverages: raw.coverages.filter((item) => policyIds.has(item.policyId)),
		members: raw.members.filter((item) => policyIds.has(item.policyId)),
		nominees: raw.nominees.filter((item) => policyIds.has(item.policyId)),
		premiums: raw.premiums.filter((item) => policyIds.has(item.policyId)),
		renewals: raw.renewals.filter((item) => policyIds.has(item.policyId)),
		claims: raw.claims.filter((item) => policyIds.has(item.policyId)),
		benefits: raw.benefits.filter((item) => policyIds.has(item.policyId)),
		exclusions: raw.exclusions.filter((item) => policyIds.has(item.policyId)),
		documents: raw.documents.filter(matchesMember),
		insurers: raw.insurers,
	}
}

export const defaultInsuranceKnowledgeDataSource =
	new DefaultInsuranceKnowledgeDataSource()
