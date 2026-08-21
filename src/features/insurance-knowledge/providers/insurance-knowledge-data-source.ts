import type { ConnectorDocumentRecord } from '@/core/connectors'
import { listRegistryRecords } from '@/features/connectors/services/connector-store.service'
import { listFamilyMembersWithAliases } from '@/features/family/services/family.service'
import { listInsuranceSourceAssignments } from '@/features/family/services/insurance-sources.service'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { InsuranceKnowledgeGetInput } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type {
	InsuranceDocumentRecord,
	InsuranceKnowledgeRawRecords,
	InsurancePolicyRecord,
} from '@/features/insurance-knowledge/types/insurance-record.types'
import { deriveInsuranceRecordsFromDocuments } from '@/features/insurance-knowledge/services/derive-insurance-records-from-documents'
import { supabase } from '@/lib/supabase'
import { qaShouldBypassRemoteTables } from '@/qa/qa-boundary'

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

function mapPolicy(row: Record<string, unknown>): InsurancePolicyRecord {
	return {
		id: row.id as string,
		userId: row.user_id as string,
		familyMemberId: (row.family_member_id as string | null) ?? null,
		policyNumber: row.policy_number as string,
		policyType: row.policy_type as InsurancePolicyRecord['policyType'],
		productName: (row.product_name as string | null) ?? null,
		insurerId: (row.insurer_id as string) ?? 'unknown-insurer',
		status: row.status as InsurancePolicyRecord['status'],
		inceptionDate: (row.inception_date as string | null) ?? null,
		expiryDate: (row.expiry_date as string | null) ?? null,
		renewalDate: (row.renewal_date as string | null) ?? null,
		sumInsured: row.sum_insured != null ? Number(row.sum_insured) : null,
		currency: (row.currency as string) ?? 'INR',
		sourceDocumentIds: Array.isArray(row.source_document_ids)
			? (row.source_document_ids as string[])
			: [],
		extractionMethod:
			row.extraction_method as InsurancePolicyRecord['extractionMethod'],
		confidence: Number(row.confidence ?? 0.5),
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string,
	}
}

function mapDocument(row: Record<string, unknown>): InsuranceDocumentRecord {
	return {
		id: row.id as string,
		userId: row.user_id as string,
		familyMemberId: (row.family_member_id as string | null) ?? null,
		registryId: (row.registry_id as string | null) ?? null,
		fileName: row.file_name as string,
		storagePath: (row.storage_path as string | null) ?? '',
		documentKind: row.document_kind as InsuranceDocumentRecord['documentKind'],
		status: row.status as string,
		linkedPolicyIds: [],
		parsedData: (row.parsed_data as Record<string, unknown> | null) ?? null,
		uploadedAt: row.uploaded_at as string,
		processedAt: (row.processed_at as string | null) ?? null,
	}
}

async function fetchInsurancePolicies(
	userId: string,
): Promise<InsurancePolicyRecord[]> {
	if (qaShouldBypassRemoteTables(userId)) {
		return []
	}

	const { data, error } = await supabase
		.from('insurance_policies')
		.select('*')
		.eq('user_id', userId)
		.order('updated_at', { ascending: false })

	if (error) {
		if (error.message.includes('insurance_policies')) {
			return []
		}

		throw new Error(error.message)
	}

	return (data ?? []).map((row) => mapPolicy(row as Record<string, unknown>))
}

async function fetchInsuranceDocuments(
	userId: string,
): Promise<InsuranceDocumentRecord[]> {
	if (qaShouldBypassRemoteTables(userId)) {
		return []
	}

	const { data, error } = await supabase
		.from('insurance_documents')
		.select('*')
		.eq('user_id', userId)
		.order('uploaded_at', { ascending: false })

	if (error) {
		if (error.message.includes('insurance_documents')) {
			return []
		}

		throw new Error(error.message)
	}

	return (data ?? []).map((row) => mapDocument(row as Record<string, unknown>))
}

async function fetchScopedImportRegistry(
	userId: string,
): Promise<ConnectorDocumentRecord[]> {
	const assignments = await listInsuranceSourceAssignments(userId)
	const folderIds = new Set(
		assignments.map((assignment) => assignment.folderId),
	)

	if (folderIds.size === 0) {
		return []
	}

	const registry = await listRegistryRecords(userId, GOOGLE_DRIVE).catch(
		() => [],
	)

	return registry.filter(
		(row) =>
			(row.targetModule === 'insurance' ||
				row.discoveryCategory === 'insurance_policy') &&
			(row.folderId == null || folderIds.has(row.folderId)),
	)
}

export class DefaultInsuranceKnowledgeDataSource implements InsuranceKnowledgeDataSource {
	async fetchRawData(
		input: InsuranceKnowledgeGetInput,
	): Promise<InsuranceKnowledgeRawData> {
		const [familyMembers, policies, documents, importRegistry] =
			await Promise.all([
				listFamilyMembersWithAliases(input.userId),
				fetchInsurancePolicies(input.userId),
				fetchInsuranceDocuments(input.userId),
				fetchScopedImportRegistry(input.userId),
			])

		const derived = deriveInsuranceRecordsFromDocuments({ policies, documents })

		return {
			policies,
			coverages: [],
			members: derived.members,
			nominees: [],
			premiums: derived.premiums,
			renewals: derived.renewals,
			claims: [],
			benefits: [],
			exclusions: [],
			documents: derived.documents,
			insurers: derived.insurers,
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
