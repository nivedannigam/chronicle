export function entityId(prefix: string, id: string): string {
	return `${prefix}:${id}`
}

export function relationshipId(type: string, from: string, to: string): string {
	return `${type}:${from}->${to}`
}

export function mapInsuranceRelationshipType(
	type: string,
): import('@/shared/knowledge-graph/types/relationship.types').ChronicleRelationshipType {
	switch (type) {
		case 'covers':
			return 'covers'
		case 'issued_by':
			return 'issued_by'
		case 'contains':
			return 'contains'
		case 'has':
			return 'includes'
		case 'belongs_to':
			return 'belongs_to'
		case 'names':
			return 'related_to'
		case 'evidenced_by':
			return 'references'
		default:
			return 'related_to'
	}
}

export function mapDomainEntityType(
	domainType: string,
): import('@/shared/knowledge-graph/types/entity.types').ChronicleEntityType {
	switch (domainType) {
		case 'Policy':
			return 'InsurancePolicy'
		case 'Insurer':
			return 'Organization'
		case 'InsuredMember':
		case 'Nominee':
			return 'FamilyMember'
		case 'Coverage':
			return 'Coverage'
		case 'Claim':
			return 'Claim'
		case 'InsuranceDocument':
		case 'Document':
			return 'Document'
		case 'PolicyCategory':
			return 'Coverage'
		default:
			return 'Document'
	}
}
