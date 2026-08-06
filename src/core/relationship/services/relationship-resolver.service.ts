import type {
	RelationshipResolveInput,
	ResolvedRelationshipType,
} from '@/core/relationship/contracts/relationship-registry.contract'
import type { ChronicleRelationshipType } from '@/shared/knowledge-graph/types/relationship.types'
import { mapInsuranceRelationshipType } from '@/shared/knowledge-graph/utils/graph-id.utils'

export function resolveRelationshipType(
	input: RelationshipResolveInput,
): ResolvedRelationshipType {
	const canonicalType = mapDomainRelationshipType(
		input.domain,
		input.relationshipType,
	)

	return {
		canonicalType,
		label: formatRelationshipLabel(canonicalType),
	}
}

function mapDomainRelationshipType(
	domain: string,
	type: string,
): ChronicleRelationshipType {
	if (domain === 'insurance') {
		return mapInsuranceRelationshipType(type)
	}

	switch (type) {
		case 'owns':
		case 'belongs_to':
		case 'contains':
		case 'covered_by':
		case 'covers':
		case 'references':
		case 'related_to':
		case 'member_of':
		case 'supports':
		case 'includes':
		case 'attached_to':
		case 'renews':
		case 'replaces':
		case 'supersedes':
		case 'used_by':
		case 'managed_by':
		case 'depends_on':
		case 'created_from':
		case 'issued_by':
			return type
		default:
			return 'related_to'
	}
}

function formatRelationshipLabel(type: ChronicleRelationshipType): string {
	return type.replace(/_/g, ' ')
}

export function invertRelationshipType(
	type: ChronicleRelationshipType,
): ChronicleRelationshipType | null {
	switch (type) {
		case 'covers':
			return 'covered_by'
		case 'covered_by':
			return 'covers'
		case 'owns':
			return 'belongs_to'
		case 'belongs_to':
			return 'owns'
		default:
			return null
	}
}
