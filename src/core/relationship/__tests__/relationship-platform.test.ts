import { describe, expect, it, beforeEach } from 'vitest'
import { HealthKnowledgeProvider } from '@/features/health-knowledge/providers/health-knowledge.provider'
import type { HealthKnowledgeRawData } from '@/features/health-knowledge/providers/health-knowledge-data-source'
import { InsuranceKnowledgeProvider } from '@/features/insurance-knowledge/providers/insurance-knowledge.provider'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'
import {
	clearRelationshipProviders,
	getRegisteredRelationshipProviderIds,
	getEntityTypesForDomain,
} from '@/core/relationship/registries/relationship-provider-registry'
import {
	registerRelationshipProviders,
	resetRelationshipProviderRegistrationGuard,
} from '@/core/relationship/bootstrap/register-relationship-providers'
import {
	initializeRelationshipPlatform,
	resetRelationshipPlatformBootstrapGuard,
	isRelationshipPlatformInitialized,
} from '@/core/relationship/bootstrap/initialize-relationship-platform'
import { RelationshipPlatformService } from '@/core/relationship/services/relationship-platform.service'
import {
	resolveEntityRef,
	resolveFamilyMemberRef,
	parseEntityId,
} from '@/core/relationship/services/entity-resolver.service'
import { resolveRelationshipType } from '@/core/relationship/services/relationship-resolver.service'
import { KnowledgeGraphService } from '@/shared/knowledge-graph/services/knowledge-graph.service'
import { healthGraphAdapter } from '@/shared/knowledge-graph/adapters/health-graph.adapter'
import { insuranceGraphAdapter } from '@/shared/knowledge-graph/adapters/insurance-graph.adapter'
import { entityId } from '@/shared/knowledge-graph/utils/graph-id.utils'

const USER_ID = 'user-rel-1'
const MEMBER_ID = 'member-rel-1'

function member(): FamilyMemberWithAliases {
	return {
		id: MEMBER_ID,
		userId: USER_ID,
		familyId: 'family-1',
		displayName: 'Nivedan',
		relationship: 'self',
		isAccountOwner: true,
		roleId: 'owner',
		dateOfBirth: null,
		gender: null,
		status: 'active',
		avatarUrl: null,
		sortOrder: 0,
		createdAt: '2026-01-01T00:00:00.000Z',
		updatedAt: '2026-01-01T00:00:00.000Z',
		aliases: [],
	}
}

function healthRawData(): HealthKnowledgeRawData {
	const report: UploadedHealthReport = {
		id: 'report-rel-1',
		user_id: USER_ID,
		family_member_id: MEMBER_ID,
		file_name: 'Thyrocare.pdf',
		storage_path: 'path',
		report_date: '2026-03-09',
		report_type: 'general',
		status: 'completed',
		uploaded_at: '2026-03-09T00:00:00.000Z',
		parsed_data: {
			metrics: [
				{
					canonicalId: 'ldl',
					displayName: 'LDL Cholesterol',
					rawName: 'LDL',
					value: '110',
					unit: 'mg/dL',
					status: 'normal',
				},
			],
			metadata: { laboratory: 'Thyrocare', reportDate: '2026-03-09' },
		},
	} as unknown as UploadedHealthReport

	return {
		uploadedReports: [report],
		storedMetrics: [
			{
				id: 'metric-ldl',
				user_id: USER_ID,
				family_member_id: MEMBER_ID,
				report_id: 'report-rel-1',
				workflow_item_id: null,
				canonical_metric_id: 'ldl',
				display_name: 'LDL Cholesterol',
				raw_name: 'LDL',
				value: '110',
				numeric_value: 110,
				unit: 'mg/dL',
				reference_range_raw: '< 100',
				reference_lower: null,
				reference_upper: 100,
				status: 'normal',
				category: 'heart',
				report_date: '2026-03-09',
				observed_at: '2026-03-09T00:00:00.000Z',
				confidence: 0.9,
				source: 'parser',
				created_at: '2026-03-09T00:00:00.000Z',
			} as StoredHealthMetric,
		],
		familyMembers: [member()],
		importRegistry: [],
	}
}

function insuranceRawData(): InsuranceKnowledgeRawData {
	return {
		policies: [
			{
				id: 'policy-rel-1',
				userId: USER_ID,
				familyMemberId: MEMBER_ID,
				policyNumber: 'POL-REL-001',
				policyType: 'health',
				productName: 'Optima Restore',
				insurerId: 'insurer-rel-1',
				status: 'active',
				inceptionDate: '2024-04-01',
				expiryDate: '2027-03-31',
				renewalDate: '2027-03-01',
				sumInsured: 500000,
				currency: 'INR',
				sourceDocumentIds: [],
				extractionMethod: 'llm',
				confidence: 0.92,
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-03-01T00:00:00.000Z',
			},
		],
		coverages: [
			{
				id: 'coverage-rel-1',
				policyId: 'policy-rel-1',
				canonicalCoverageId: 'hospitalization',
				displayName: 'Hospitalization',
				sumInsured: 500000,
				sublimit: null,
				deductible: null,
				copay: null,
				waitingPeriodDays: 30,
				status: 'active',
			},
		],
		members: [],
		nominees: [],
		premiums: [],
		renewals: [],
		claims: [],
		benefits: [],
		exclusions: [],
		documents: [],
		insurers: [
			{
				id: 'insurer-rel-1',
				canonicalName: 'HDFC ERGO',
				displayName: 'HDFC Ergo',
				country: 'IN',
			},
		],
		familyMembers: [member()],
		importRegistry: [],
	}
}

function buildHealthKnowledge() {
	const provider = new HealthKnowledgeProvider({
		fetchRawData: async () => healthRawData(),
	})

	return provider.buildFromRawData(healthRawData(), {
		userId: USER_ID,
		familyMemberId: MEMBER_ID,
		accountOwnerMemberId: MEMBER_ID,
	})
}

function buildInsuranceKnowledge() {
	const provider = new InsuranceKnowledgeProvider({
		fetchRawData: async () => insuranceRawData(),
	})

	return provider.buildFromRawData(insuranceRawData(), {
		userId: USER_ID,
		familyMemberId: MEMBER_ID,
		accountOwnerMemberId: MEMBER_ID,
	})
}

describe('Chronicle Relationship Platform', () => {
	beforeEach(() => {
		clearRelationshipProviders()
		resetRelationshipProviderRegistrationGuard()
		resetRelationshipPlatformBootstrapGuard()
	})

	it('registers health, insurance, and documents relationship providers', () => {
		registerRelationshipProviders()

		const providerIds = getRegisteredRelationshipProviderIds()
		expect(providerIds).toEqual(
			expect.arrayContaining([
				'health-knowledge',
				'insurance-knowledge',
				'documents',
			]),
		)

		const healthTypes = getEntityTypesForDomain('health')
		expect(healthTypes).toEqual(
			expect.arrayContaining(['HealthReport', 'HealthMetric']),
		)

		const insuranceTypes = getEntityTypesForDomain('insurance')
		expect(insuranceTypes).toEqual(
			expect.arrayContaining(['InsurancePolicy', 'Claim', 'Coverage']),
		)
	})

	it('initializeRelationshipPlatform is idempotent', () => {
		expect(isRelationshipPlatformInitialized()).toBe(false)

		initializeRelationshipPlatform()
		const firstIds = getRegisteredRelationshipProviderIds()

		initializeRelationshipPlatform()
		expect(isRelationshipPlatformInitialized()).toBe(true)
		expect(getRegisteredRelationshipProviderIds()).toEqual(firstIds)
	})

	it('resolves domain entity refs to canonical graph IDs', () => {
		const memberRef = resolveFamilyMemberRef(MEMBER_ID)
		expect(memberRef.id).toBe(entityId('family-member', MEMBER_ID))
		expect(memberRef.type).toBe('FamilyMember')

		const policyRef = resolveEntityRef({
			domain: 'insurance',
			entityType: 'Policy',
			rawId: 'policy-rel-1',
		})
		expect(policyRef.id).toBe(entityId('insurance-policy', 'policy-rel-1'))
		expect(policyRef.type).toBe('InsurancePolicy')

		const parsed = parseEntityId(policyRef.id)
		expect(parsed).toEqual({
			prefix: 'insurance-policy',
			rawId: 'policy-rel-1',
		})
	})

	it('resolves domain relationship types to canonical types', () => {
		const resolved = resolveRelationshipType({
			domain: 'insurance',
			relationshipType: 'evidenced_by',
			fromEntityType: 'Document',
			toEntityType: 'Policy',
		})

		expect(resolved.canonicalType).toBe('references')
		expect(resolved.label).toBe('references')
	})

	it('ingests health and insurance knowledge into a connected graph', () => {
		const graph = new KnowledgeGraphService()
		graph.registerAdapter(healthGraphAdapter)
		graph.registerAdapter(insuranceGraphAdapter)

		const platform = new RelationshipPlatformService(graph)
		const snapshot = platform.ingestAll({
			health: buildHealthKnowledge(),
			insurance: buildInsuranceKnowledge(),
		})

		expect(snapshot.entityCount).toBeGreaterThan(5)
		expect(snapshot.relationshipCount).toBeGreaterThan(3)

		const memberEntityId = entityId('family-member', MEMBER_ID)
		const related = platform.findRelated({
			entityId: memberEntityId,
			direction: 'incoming',
		})

		const relatedTypes = new Set(related.map((item) => item.entity.type))
		expect(relatedTypes.has('HealthReport')).toBe(true)
		expect(relatedTypes.has('InsurancePolicy')).toBe(true)

		const policyRelated = platform.findRelated({
			entityId: entityId('insurance-policy', 'policy-rel-1'),
			relationshipTypes: ['includes'],
			direction: 'outgoing',
		})
		expect(policyRelated.some((item) => item.entity.type === 'Coverage')).toBe(
			true,
		)
	})

	it('builds Ask context from relationship-linked entities', () => {
		const graph = new KnowledgeGraphService()
		graph.registerAdapter(healthGraphAdapter)
		graph.registerAdapter(insuranceGraphAdapter)

		const platform = new RelationshipPlatformService(graph)
		platform.ingestAll({
			health: buildHealthKnowledge(),
			insurance: buildInsuranceKnowledge(),
		})

		const context = platform.buildContext({
			question: 'Tell me everything about Nivedan',
			intent: 'GENERAL_HEALTH_SUMMARY',
			seedEntityIds: [entityId('family-member', MEMBER_ID)],
		})

		expect(context.entities.length).toBeGreaterThan(2)
		expect(context.linkedEntityIds.length).toBeGreaterThan(2)
	})
})
