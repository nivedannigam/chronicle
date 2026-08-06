import type {
	EntityResolveInput,
	ResolvedEntityRef,
} from '@/core/relationship/contracts/entity-registry.contract'
import type { ChronicleEntityType } from '@/shared/knowledge-graph/types/entity.types'
import { entityId } from '@/shared/knowledge-graph/utils/graph-id.utils'

const DOMAIN_ENTITY_PREFIX: Record<string, string> = {
	Person: 'person',
	FamilyMember: 'family-member',
	HealthReport: 'health-report',
	HealthMetric: 'health-metric',
	HealthCategory: 'health-category',
	Document: 'document',
	InsurancePolicy: 'insurance-policy',
	Claim: 'claim',
	Coverage: 'coverage',
	Organization: 'organization',
	Asset: 'asset',
	Vehicle: 'vehicle',
	Property: 'property',
	Trip: 'trip',
	Passport: 'passport',
	Visa: 'visa',
}

export function resolveEntityRef(input: EntityResolveInput): ResolvedEntityRef {
	const prefix = resolvePrefix(input.domain, input.entityType)
	const id = entityId(prefix, input.rawId)

	return {
		id,
		type: mapEntityType(input.entityType),
	}
}

export function resolveFamilyMemberRef(memberId: string): ResolvedEntityRef {
	return {
		id: entityId('family-member', memberId),
		type: 'FamilyMember',
	}
}

export function resolvePersonRef(userId: string): ResolvedEntityRef {
	return {
		id: entityId('person', userId),
		type: 'Person',
	}
}

function resolvePrefix(domain: string, entityType: string): string {
	if (DOMAIN_ENTITY_PREFIX[entityType]) {
		return DOMAIN_ENTITY_PREFIX[entityType]!
	}

	switch (entityType) {
		case 'Policy':
			return 'insurance-policy'
		case 'Insurer':
			return 'organization'
		default:
			return `${domain}-${entityType}`.toLowerCase().replace(/\s+/g, '-')
	}
}

function mapEntityType(entityType: string): ChronicleEntityType {
	if (entityType in DOMAIN_ENTITY_PREFIX) {
		return entityType as ChronicleEntityType
	}

	switch (entityType) {
		case 'Policy':
			return 'InsurancePolicy'
		case 'Insurer':
			return 'Organization'
		case 'InsuredMember':
		case 'Nominee':
			return 'FamilyMember'
		default:
			return 'Document'
	}
}

export function parseEntityId(
	canonicalId: string,
): { prefix: string; rawId: string } | null {
	const separator = canonicalId.indexOf(':')
	if (separator <= 0) {
		return null
	}

	return {
		prefix: canonicalId.slice(0, separator),
		rawId: canonicalId.slice(separator + 1),
	}
}
