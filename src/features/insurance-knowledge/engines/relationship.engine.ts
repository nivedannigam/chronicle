import { getPolicyRelationships } from '@/features/insurance-knowledge/graph/policy-relationships'
import { mapPolicyTypeToCategoryId } from '@/features/insurance-knowledge/graph/policy-categories'
import type { PolicyRelationship } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import type {
	InsuranceBenefitRecord,
	InsuranceClaimRecord,
	InsuranceCoverageRecord,
	InsuranceDocumentRecord,
	InsuranceInsurerRecord,
	InsuranceMemberRecord,
	InsuranceNomineeRecord,
	InsurancePolicyRecord,
	InsuranceExclusionRecord,
} from '@/features/insurance-knowledge/types/insurance-record.types'

export function buildPolicyRelationships(input: {
	policies: InsurancePolicyRecord[]
	coverages: InsuranceCoverageRecord[]
	members: InsuranceMemberRecord[]
	nominees: InsuranceNomineeRecord[]
	claims: InsuranceClaimRecord[]
	documents: InsuranceDocumentRecord[]
	benefits: InsuranceBenefitRecord[]
	exclusions: InsuranceExclusionRecord[]
	insurers: InsuranceInsurerRecord[]
}): PolicyRelationship[] {
	const relationships: PolicyRelationship[] = []
	const templates = getPolicyRelationships()

	for (const policy of input.policies) {
		for (const template of templates) {
			if (template.toEntityType === 'PolicyCategory') {
				relationships.push({
					...template,
					id: `${template.id}-${policy.id}`,
					fromEntityId: policy.id,
					toEntityId: mapPolicyTypeToCategoryId(policy.policyType),
				})
				continue
			}

			if (template.toEntityType === 'Insurer') {
				relationships.push({
					...template,
					id: `${template.id}-${policy.id}`,
					fromEntityId: policy.id,
					toEntityId: policy.insurerId,
				})
			}
		}

		for (const member of input.members.filter(
			(item) => item.policyId === policy.id,
		)) {
			relationships.push({
				id: `rel-covers-${policy.id}-${member.id}`,
				fromEntityId: policy.id,
				fromEntityType: 'Policy',
				toEntityId: member.id,
				toEntityType: 'InsuredMember',
				relationshipType: 'covers',
				label: `${policy.policyNumber} covers ${member.name}`,
			})
		}

		for (const nominee of input.nominees.filter(
			(item) => item.policyId === policy.id,
		)) {
			relationships.push({
				id: `rel-names-${policy.id}-${nominee.id}`,
				fromEntityId: policy.id,
				fromEntityType: 'Policy',
				toEntityId: nominee.id,
				toEntityType: 'Nominee',
				relationshipType: 'names',
				label: `${policy.policyNumber} names ${nominee.name} as nominee`,
			})
		}

		for (const coverage of input.coverages.filter(
			(item) => item.policyId === policy.id,
		)) {
			relationships.push({
				id: `rel-coverage-${policy.id}-${coverage.id}`,
				fromEntityId: policy.id,
				fromEntityType: 'Policy',
				toEntityId: coverage.id,
				toEntityType: 'Coverage',
				relationshipType: 'contains',
				label: `${policy.policyNumber} includes ${coverage.displayName}`,
			})
		}

		for (const benefit of input.benefits.filter(
			(item) => item.policyId === policy.id,
		)) {
			relationships.push({
				id: `rel-benefit-${policy.id}-${benefit.id}`,
				fromEntityId: policy.id,
				fromEntityType: 'Policy',
				toEntityId: benefit.id,
				toEntityType: 'Benefit',
				relationshipType: 'contains',
				label: benefit.description,
			})
		}

		for (const exclusion of input.exclusions.filter(
			(item) => item.policyId === policy.id,
		)) {
			relationships.push({
				id: `rel-exclusion-${policy.id}-${exclusion.id}`,
				fromEntityId: policy.id,
				fromEntityType: 'Policy',
				toEntityId: exclusion.id,
				toEntityType: 'Exclusion',
				relationshipType: 'contains',
				label: exclusion.description,
			})
		}

		for (const claim of input.claims.filter(
			(item) => item.policyId === policy.id,
		)) {
			relationships.push({
				id: `rel-claim-${policy.id}-${claim.id}`,
				fromEntityId: policy.id,
				fromEntityType: 'Policy',
				toEntityId: claim.id,
				toEntityType: 'Claim',
				relationshipType: 'has',
				label: `Claim ${claim.claimNumber}`,
			})
		}

		for (const documentId of policy.sourceDocumentIds) {
			relationships.push({
				id: `rel-document-${policy.id}-${documentId}`,
				fromEntityId: policy.id,
				fromEntityType: 'Policy',
				toEntityId: documentId,
				toEntityType: 'InsuranceDocument',
				relationshipType: 'has',
				label: 'Policy evidenced by document',
			})
		}
	}

	return relationships
}

export function getAllPolicyRelationships(): PolicyRelationship[] {
	return getPolicyRelationships()
}

export function findRelationshipsForPolicy(
	policyId: string,
	relationships: PolicyRelationship[],
): PolicyRelationship[] {
	return relationships.filter(
		(relationship) =>
			relationship.fromEntityId === policyId ||
			relationship.toEntityId === policyId,
	)
}

export function findRelatedEntityIds(
	entityId: string,
	relationships: PolicyRelationship[],
): string[] {
	const related = new Set<string>()

	for (const relationship of relationships) {
		if (relationship.fromEntityId === entityId) {
			related.add(relationship.toEntityId)
		} else if (relationship.toEntityId === entityId) {
			related.add(relationship.fromEntityId)
		}
	}

	return [...related]
}
