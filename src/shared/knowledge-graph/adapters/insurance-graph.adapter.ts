import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { GraphDomainAdapter } from '@/shared/knowledge-graph/contracts/graph-domain-adapter.contract'
import type { GraphStore } from '@/shared/knowledge-graph/store/graph-store'
import {
	entityId,
	mapDomainEntityType,
	mapInsuranceRelationshipType,
	relationshipId,
} from '@/shared/knowledge-graph/utils/graph-id.utils'

function resolveCanonicalEntityId(
	domainType: string,
	rawId: string,
	knowledge: InsuranceKnowledge,
): string {
	switch (domainType) {
		case 'Policy':
			return entityId('insurance-policy', rawId)
		case 'Insurer':
			return entityId('organization', rawId)
		case 'InsuredMember':
		case 'Nominee':
			return entityId(
				'family-member',
				knowledge.familyMember.id ?? knowledge.holder.userId,
			)
		case 'Coverage':
			return entityId('coverage', rawId)
		case 'Claim':
			return entityId('claim', rawId)
		case 'InsuranceDocument':
			return entityId('document', rawId)
		default:
			return entityId(domainType.toLowerCase(), rawId)
	}
}

export function ingestInsuranceKnowledge(
	store: GraphStore,
	knowledge: InsuranceKnowledge,
): { entityCount: number; relationshipCount: number } {
	const before = store.snapshot()
	const memberEntityId = entityId(
		'family-member',
		knowledge.familyMember.id ?? knowledge.holder.userId,
	)

	store.upsertEntity({
		id: entityId('person', knowledge.holder.userId),
		type: 'Person',
		label: knowledge.familyMember.displayName,
		domain: 'family',
		sourceProvider: 'insurance-knowledge',
		memberId: knowledge.familyMember.id,
		metadata: { userId: knowledge.holder.userId },
	})

	store.upsertEntity({
		id: memberEntityId,
		type: 'FamilyMember',
		label: knowledge.familyMember.displayName,
		domain: 'family',
		sourceProvider: 'insurance-knowledge',
		memberId: knowledge.familyMember.id,
		metadata: {
			relationship: knowledge.familyMember.relationship,
			isAccountOwner: knowledge.familyMember.isAccountOwner,
		},
	})

	store.upsertRelationship({
		id: relationshipId(
			'member_of',
			memberEntityId,
			entityId('person', knowledge.holder.userId),
		),
		type: 'member_of',
		fromEntityId: memberEntityId,
		toEntityId: entityId('person', knowledge.holder.userId),
		label: 'member of',
		domain: 'family',
		sourceProvider: 'insurance-knowledge',
	})

	for (const insurer of knowledge.insurers) {
		store.upsertEntity({
			id: entityId('organization', insurer.id),
			type: 'Organization',
			label: insurer.displayName,
			domain: 'insurance',
			sourceProvider: 'insurance-knowledge',
			metadata: {
				canonicalName: insurer.canonicalName,
				country: insurer.country,
				kind: 'insurer',
			},
		})
	}

	for (const policy of knowledge.policies) {
		const policyEntityId = entityId('insurance-policy', policy.id)

		store.upsertEntity({
			id: policyEntityId,
			type: 'InsurancePolicy',
			label: policy.productName ?? policy.policyNumber,
			domain: 'insurance',
			sourceProvider: 'insurance-knowledge',
			memberId: knowledge.familyMember.id,
			metadata: {
				policyNumber: policy.policyNumber,
				policyType: policy.policyType,
				status: policy.status,
				sumInsured: policy.sumInsured,
				expiryDate: policy.expiryDate,
				insurerId: policy.insurerId,
			},
		})

		store.upsertRelationship({
			id: relationshipId('belongs_to', policyEntityId, memberEntityId),
			type: 'belongs_to',
			fromEntityId: policyEntityId,
			toEntityId: memberEntityId,
			label: 'belongs to',
			domain: 'insurance',
			sourceProvider: 'insurance-knowledge',
		})

		store.upsertRelationship({
			id: relationshipId(
				'issued_by',
				policyEntityId,
				entityId('organization', policy.insurerId),
			),
			type: 'issued_by',
			fromEntityId: policyEntityId,
			toEntityId: entityId('organization', policy.insurerId),
			label: 'issued by',
			domain: 'insurance',
			sourceProvider: 'insurance-knowledge',
		})
	}

	for (const coverage of knowledge.coverages) {
		const coverageEntityId = entityId('coverage', coverage.id)
		const policyEntityId = entityId('insurance-policy', coverage.policyId)

		store.upsertEntity({
			id: coverageEntityId,
			type: 'Coverage',
			label: coverage.displayName,
			domain: 'insurance',
			sourceProvider: 'insurance-knowledge',
			memberId: knowledge.familyMember.id,
			metadata: {
				sumInsured: coverage.sumInsured,
				status: coverage.status,
				policyId: coverage.policyId,
			},
		})

		store.upsertRelationship({
			id: relationshipId('includes', policyEntityId, coverageEntityId),
			type: 'includes',
			fromEntityId: policyEntityId,
			toEntityId: coverageEntityId,
			label: 'includes coverage',
			domain: 'insurance',
			sourceProvider: 'insurance-knowledge',
		})
	}

	for (const claim of knowledge.claims) {
		const claimEntityId = entityId('claim', claim.id)
		const policyEntityId = entityId('insurance-policy', claim.policyId)

		store.upsertEntity({
			id: claimEntityId,
			type: 'Claim',
			label: claim.claimNumber ?? claim.id,
			domain: 'insurance',
			sourceProvider: 'insurance-knowledge',
			memberId: knowledge.familyMember.id,
			metadata: {
				claimType: claim.claimType,
				status: claim.status,
				policyId: claim.policyId,
				providerName: claim.providerName,
			},
		})

		store.upsertRelationship({
			id: relationshipId('references', claimEntityId, policyEntityId),
			type: 'references',
			fromEntityId: claimEntityId,
			toEntityId: policyEntityId,
			label: 'references policy',
			domain: 'insurance',
			sourceProvider: 'insurance-knowledge',
		})
	}

	for (const document of knowledge.documents) {
		const docEntityId = entityId('document', document.id)

		store.upsertEntity({
			id: docEntityId,
			type: 'Document',
			label: document.fileName,
			domain: 'insurance',
			sourceProvider: 'insurance-knowledge',
			memberId: knowledge.familyMember.id,
			metadata: {
				documentKind: document.documentKind,
				status: document.status,
				linkedPolicyIds: document.linkedPolicyIds,
			},
		})

		store.upsertRelationship({
			id: relationshipId('belongs_to', docEntityId, memberEntityId),
			type: 'belongs_to',
			fromEntityId: docEntityId,
			toEntityId: memberEntityId,
			label: 'belongs to',
			domain: 'insurance',
			sourceProvider: 'insurance-knowledge',
		})

		for (const policyId of document.linkedPolicyIds) {
			store.upsertRelationship({
				id: relationshipId(
					'supports',
					docEntityId,
					entityId('insurance-policy', policyId),
				),
				type: 'supports',
				fromEntityId: docEntityId,
				toEntityId: entityId('insurance-policy', policyId),
				label: 'supports policy',
				domain: 'insurance',
				sourceProvider: 'insurance-knowledge',
			})
		}
	}

	for (const rel of knowledge.relationships) {
		const fromId = resolveCanonicalEntityId(
			rel.fromEntityType,
			rel.fromEntityId,
			knowledge,
		)
		const toId = resolveCanonicalEntityId(
			rel.toEntityType,
			rel.toEntityId,
			knowledge,
		)
		const relType = mapInsuranceRelationshipType(rel.relationshipType)

		if (!store.getEntity(fromId) || !store.getEntity(toId)) {
			continue
		}

		store.upsertRelationship({
			id: relationshipId(relType, fromId, toId),
			type: relType,
			fromEntityId: fromId,
			toEntityId: toId,
			label: rel.label,
			domain: 'insurance',
			sourceProvider: 'insurance-knowledge',
			metadata: {
				fromEntityType: mapDomainEntityType(rel.fromEntityType),
				toEntityType: mapDomainEntityType(rel.toEntityType),
			},
		})
	}

	const after = store.snapshot()
	return {
		entityCount: after.entityCount - before.entityCount,
		relationshipCount: after.relationshipCount - before.relationshipCount,
	}
}

export const insuranceGraphAdapter: GraphDomainAdapter<InsuranceKnowledge> = {
	domain: 'insurance',
	providerId: 'insurance-knowledge',
	entityTypes: [
		'Person',
		'FamilyMember',
		'InsurancePolicy',
		'Organization',
		'Coverage',
		'Claim',
		'Document',
	],
	ingest: ingestInsuranceKnowledge,
}
