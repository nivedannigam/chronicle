import type { PolicyRelationship } from '@/features/insurance-knowledge/types/insurance-knowledge.types'

export const POLICY_RELATIONSHIPS: PolicyRelationship[] = [
	{
		id: 'rel-policy-covers-member',
		fromEntityId: 'policy',
		fromEntityType: 'Policy',
		toEntityId: 'member',
		toEntityType: 'InsuredMember',
		relationshipType: 'covers',
		label: 'Policy covers insured member',
	},
	{
		id: 'rel-policy-issued-by-insurer',
		fromEntityId: 'policy',
		fromEntityType: 'Policy',
		toEntityId: 'insurer',
		toEntityType: 'Insurer',
		relationshipType: 'issued_by',
		label: 'Policy issued by insurer',
	},
	{
		id: 'rel-policy-contains-coverage',
		fromEntityId: 'policy',
		fromEntityType: 'Policy',
		toEntityId: 'coverage',
		toEntityType: 'Coverage',
		relationshipType: 'contains',
		label: 'Policy contains coverage line',
	},
	{
		id: 'rel-policy-contains-benefit',
		fromEntityId: 'policy',
		fromEntityType: 'Policy',
		toEntityId: 'benefit',
		toEntityType: 'Benefit',
		relationshipType: 'contains',
		label: 'Policy contains benefit',
	},
	{
		id: 'rel-policy-contains-exclusion',
		fromEntityId: 'policy',
		fromEntityType: 'Policy',
		toEntityId: 'exclusion',
		toEntityType: 'Exclusion',
		relationshipType: 'contains',
		label: 'Policy contains exclusion',
	},
	{
		id: 'rel-policy-has-claim',
		fromEntityId: 'policy',
		fromEntityType: 'Policy',
		toEntityId: 'claim',
		toEntityType: 'Claim',
		relationshipType: 'has',
		label: 'Policy has claim',
	},
	{
		id: 'rel-policy-has-document',
		fromEntityId: 'policy',
		fromEntityType: 'Policy',
		toEntityId: 'document',
		toEntityType: 'InsuranceDocument',
		relationshipType: 'has',
		label: 'Policy evidenced by document',
	},
	{
		id: 'rel-policy-belongs-to-category',
		fromEntityId: 'policy',
		fromEntityType: 'Policy',
		toEntityId: 'category',
		toEntityType: 'PolicyCategory',
		relationshipType: 'belongs_to',
		label: 'Policy belongs to coverage category',
	},
	{
		id: 'rel-policy-names-nominee',
		fromEntityId: 'policy',
		fromEntityType: 'Policy',
		toEntityId: 'nominee',
		toEntityType: 'Nominee',
		relationshipType: 'names',
		label: 'Policy names nominee',
	},
]

export function getPolicyRelationships(): PolicyRelationship[] {
	return POLICY_RELATIONSHIPS
}

export function getRelationshipsForPolicy(
	policyId: string,
): PolicyRelationship[] {
	return POLICY_RELATIONSHIPS.map((relationship) => ({
		...relationship,
		id: `${relationship.id}-${policyId}`,
		fromEntityId: policyId,
	}))
}

export function getRelationshipsForEntityType(
	entityType: string,
): PolicyRelationship[] {
	return POLICY_RELATIONSHIPS.filter(
		(relationship) =>
			relationship.fromEntityType === entityType ||
			relationship.toEntityType === entityType,
	)
}
