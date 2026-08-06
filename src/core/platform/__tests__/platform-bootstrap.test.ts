import { describe, expect, it, beforeEach } from 'vitest'
import { getRegisteredProviderIds } from '@/core/platform/registries/knowledge-registry'
import { getRegisteredTimelineProviderIds } from '@/core/platform/registries/timeline-registry'
import {
	getRegisteredPlatformModuleIds,
	clearPlatformModules,
	getPlatformModule,
} from '@/core/platform/registries/module-registry'
import {
	getRegisteredDocumentConsumers,
	clearDocumentConsumers,
} from '@/core/platform/registries/document-registry'
import {
	initializePlatform,
	resetPlatformBootstrapGuard,
	isPlatformInitialized,
} from '@/core/platform/bootstrap/initialize-platform'
import { getRegisteredRelationshipProviderIds } from '@/core/relationship/registries/relationship-provider-registry'
import { resetRelationshipPlatformBootstrapGuard } from '@/core/relationship/bootstrap/initialize-relationship-platform'
import { resetRelationshipProviderRegistrationGuard } from '@/core/relationship/bootstrap/register-relationship-providers'
import '@/features/health/providers/health-knowledge.provider'
import '@/features/documents/providers/documents-knowledge.provider'
import '@/features/insurance/providers/insurance-intelligence.provider'
import '@/features/intelligence/providers/timeline-knowledge.provider'
import '@/features/timeline/providers/health-timeline.provider'
import '@/features/timeline/providers/documents-timeline.provider'
import '@/features/timeline/providers/insurance-timeline.provider'
import { registerPlatformModules } from '@/core/platform/bootstrap/register-modules'
import { InsuranceKnowledgeProvider } from '@/features/insurance-knowledge/providers/insurance-knowledge.provider'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import { insuranceIntelligenceProvider } from '@/features/insurance/providers/insurance-intelligence.provider'
import type { KnowledgeProviderQuery } from '@chronicle/core-knowledge'

describe('Chronicle Core Platform bootstrap', () => {
	beforeEach(() => {
		resetPlatformBootstrapGuard()
		resetRelationshipPlatformBootstrapGuard()
		resetRelationshipProviderRegistrationGuard()
	})

	it('registers health and insurance platform modules', () => {
		clearPlatformModules()
		clearDocumentConsumers()
		registerPlatformModules()

		expect(getRegisteredPlatformModuleIds()).toEqual(
			expect.arrayContaining(['health', 'insurance']),
		)
		expect(getPlatformModule('health')?.routePrefix).toBe('/health')
		expect(getPlatformModule('insurance')?.knowledgeDomain).toBe('insurance')

		const consumers = getRegisteredDocumentConsumers()
		expect(consumers.map((consumer) => consumer.moduleId)).toEqual(
			expect.arrayContaining(['health', 'insurance']),
		)
	})

	it('initializePlatform is idempotent', () => {
		clearPlatformModules()
		expect(isPlatformInitialized()).toBe(false)

		initializePlatform()
		const firstIds = getRegisteredPlatformModuleIds()

		initializePlatform()
		expect(isPlatformInitialized()).toBe(true)
		expect(getRegisteredPlatformModuleIds()).toEqual(firstIds)
	})

	it('registers knowledge and timeline providers for health and insurance', () => {
		const knowledgeIds = getRegisteredProviderIds()
		expect(knowledgeIds).toEqual(
			expect.arrayContaining(['health', 'documents', 'insurance', 'timeline']),
		)

		const timelineIds = getRegisteredTimelineProviderIds()
		expect(timelineIds).toEqual(
			expect.arrayContaining(['health', 'documents', 'insurance']),
		)
	})

	it('initializePlatform registers relationship providers', () => {
		clearPlatformModules()
		initializePlatform()

		expect(getRegisteredRelationshipProviderIds()).toEqual(
			expect.arrayContaining([
				'health-knowledge',
				'insurance-knowledge',
				'documents',
			]),
		)
	})

	it('insurance intelligence provider supports knowledge-backed queries', () => {
		const domainProvider = new InsuranceKnowledgeProvider({
			fetchRawData: async () => ({}) as InsuranceKnowledgeRawData,
		})

		const knowledge = domainProvider.buildFromRawData(
			{
				policies: [
					{
						id: 'policy-1',
						userId: 'user-1',
						familyMemberId: 'member-1',
						policyNumber: 'POL-001',
						policyType: 'health',
						productName: 'Test Health Policy',
						insurerId: 'insurer-1',
						status: 'active',
						inceptionDate: '2024-01-01',
						expiryDate: '2027-01-01',
						renewalDate: null,
						sumInsured: 1000000,
						currency: 'INR',
						sourceDocumentIds: [],
						extractionMethod: 'llm',
						confidence: 0.9,
						createdAt: '2026-01-01T00:00:00.000Z',
						updatedAt: '2026-01-01T00:00:00.000Z',
					},
				],
				coverages: [],
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
						id: 'insurer-1',
						canonicalName: 'Test Insurer',
						displayName: 'Test Insurer',
						country: 'IN',
					},
				],
				familyMembers: [],
				importRegistry: [],
			},
			{
				userId: 'user-1',
				familyMemberId: 'member-1',
				accountOwnerMemberId: 'member-1',
			},
		)

		const query: KnowledgeProviderQuery = {
			userId: 'user-1',
			question: 'Test Health Policy',
			resolvedQuestion: 'Test Health Policy',
			intent: 'general_health',
			member: {
				memberId: 'member-1',
				memberName: 'Alex',
				familyMemberNames: ['Alex'],
			},
			sources: {
				insurance: { knowledge },
			},
		}

		expect(insuranceIntelligenceProvider.supports(query)).toBe(true)

		const hits = insuranceIntelligenceProvider.search?.(query) ?? []
		expect(hits.some((hit) => hit.domain === 'insurance')).toBe(true)

		const context = insuranceIntelligenceProvider.retrieveContext(query)
		expect(context.available).toBe(true)
		expect(context.package?.summaryLines.length).toBeGreaterThan(0)
	})
})
