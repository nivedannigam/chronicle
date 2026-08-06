import type {
	InsuranceBenefitRecord,
	InsuranceClaimRecord,
	InsuranceCoverageRecord,
	InsuranceDocumentRecord,
	InsuranceExclusionRecord,
	InsuranceMemberRecord,
	InsuranceNomineeRecord,
	InsurancePolicyRecord,
	InsurancePremiumRecord,
	InsuranceRenewalRecord,
} from '@/features/insurance-knowledge/types/insurance-record.types'
import {
	normalizePolicyNumber,
	policyDedupeKey,
} from '@/features/insurance-knowledge/utils/policy-category-resolver'

export interface MergeInsuranceRecordsInput {
	policies: InsurancePolicyRecord[]
	coverages: InsuranceCoverageRecord[]
	members: InsuranceMemberRecord[]
	nominees: InsuranceNomineeRecord[]
	premiums: InsurancePremiumRecord[]
	renewals: InsuranceRenewalRecord[]
	claims: InsuranceClaimRecord[]
	benefits: InsuranceBenefitRecord[]
	exclusions: InsuranceExclusionRecord[]
	documents: InsuranceDocumentRecord[]
	insurers: import('@/features/insurance-knowledge/types/insurance-record.types').InsuranceInsurerRecord[]
}

export interface MergedInsuranceRecords {
	policies: InsurancePolicyRecord[]
	coverages: InsuranceCoverageRecord[]
	members: InsuranceMemberRecord[]
	nominees: InsuranceNomineeRecord[]
	premiums: InsurancePremiumRecord[]
	renewals: InsuranceRenewalRecord[]
	claims: InsuranceClaimRecord[]
	benefits: InsuranceBenefitRecord[]
	exclusions: InsuranceExclusionRecord[]
	documents: InsuranceDocumentRecord[]
	insurers: import('@/features/insurance-knowledge/types/insurance-record.types').InsuranceInsurerRecord[]
	mergedPolicyIds: Map<string, string>
}

function isNewerPolicy(
	candidate: InsurancePolicyRecord,
	existing: InsurancePolicyRecord,
): boolean {
	const candidateTime = new Date(candidate.updatedAt).getTime()
	const existingTime = new Date(existing.updatedAt).getTime()

	if (candidateTime !== existingTime) {
		return candidateTime > existingTime
	}

	return candidate.confidence >= existing.confidence
}

function dedupePolicies(policies: InsurancePolicyRecord[]): {
	policies: InsurancePolicyRecord[]
	mergedPolicyIds: Map<string, string>
} {
	const byKey = new Map<string, InsurancePolicyRecord>()
	const mergedPolicyIds = new Map<string, string>()

	for (const policy of policies) {
		const key = policyDedupeKey({
			insurerId: policy.insurerId,
			policyNumber: normalizePolicyNumber(policy.policyNumber),
		})
		const existing = byKey.get(key)

		if (!existing) {
			byKey.set(key, {
				...policy,
				policyNumber: normalizePolicyNumber(policy.policyNumber),
			})
			continue
		}

		mergedPolicyIds.set(policy.id, existing.id)

		if (isNewerPolicy(policy, existing)) {
			byKey.set(key, {
				...policy,
				policyNumber: normalizePolicyNumber(policy.policyNumber),
				sourceDocumentIds: [
					...new Set([
						...existing.sourceDocumentIds,
						...policy.sourceDocumentIds,
					]),
				],
			})
		} else {
			byKey.set(key, {
				...existing,
				sourceDocumentIds: [
					...new Set([
						...existing.sourceDocumentIds,
						...policy.sourceDocumentIds,
					]),
				],
			})
		}
	}

	return {
		policies: [...byKey.values()],
		mergedPolicyIds,
	}
}

function remapPolicyId<T extends { policyId: string }>(
	items: T[],
	mergedPolicyIds: Map<string, string>,
): T[] {
	return items.map((item) => ({
		...item,
		policyId: mergedPolicyIds.get(item.policyId) ?? item.policyId,
	}))
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
	const seen = new Map<string, T>()

	for (const item of items) {
		seen.set(item.id, item)
	}

	return [...seen.values()]
}

export function mergeInsuranceRecords(
	input: MergeInsuranceRecordsInput,
): MergedInsuranceRecords {
	const { policies, mergedPolicyIds } = dedupePolicies(input.policies)
	const policyIds = new Set(policies.map((policy) => policy.id))

	const coverages = dedupeById(
		remapPolicyId(input.coverages, mergedPolicyIds).filter((item) =>
			policyIds.has(item.policyId),
		),
	)
	const members = dedupeById(
		remapPolicyId(input.members, mergedPolicyIds).filter((item) =>
			policyIds.has(item.policyId),
		),
	)
	const nominees = dedupeById(
		remapPolicyId(input.nominees, mergedPolicyIds).filter((item) =>
			policyIds.has(item.policyId),
		),
	)
	const premiums = dedupeById(
		remapPolicyId(input.premiums, mergedPolicyIds).filter((item) =>
			policyIds.has(item.policyId),
		),
	)
	const renewals = dedupeById(
		remapPolicyId(input.renewals, mergedPolicyIds).filter((item) =>
			policyIds.has(item.policyId),
		),
	)
	const claims = dedupeById(
		remapPolicyId(input.claims, mergedPolicyIds).filter((item) =>
			policyIds.has(item.policyId),
		),
	)
	const benefits = dedupeById(
		remapPolicyId(input.benefits, mergedPolicyIds).filter((item) =>
			policyIds.has(item.policyId),
		),
	)
	const exclusions = dedupeById(
		remapPolicyId(input.exclusions, mergedPolicyIds).filter((item) =>
			policyIds.has(item.policyId),
		),
	)

	const documents = input.documents.map((document) => ({
		...document,
		linkedPolicyIds: document.linkedPolicyIds.map(
			(policyId) => mergedPolicyIds.get(policyId) ?? policyId,
		),
	}))

	return {
		policies,
		coverages,
		members,
		nominees,
		premiums,
		renewals,
		claims,
		benefits,
		exclusions,
		documents,
		insurers: input.insurers,
		mergedPolicyIds,
	}
}
