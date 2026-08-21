import { getRegisteredProviders } from '@/features/intelligence/registry/intelligence-registry'
import { rankSearchHits } from '@/features/intelligence/services/search-ranking.service'
import { tokenizeQuery } from '@/features/intelligence/services/semantic-search.service'
import type {
	IntelligenceMemberContext,
	SemanticSearchHit,
} from '@/features/intelligence/types/intelligence.types'
import { buildPlatformIntelligenceSources } from '@/core/platform/services/intelligence-sources.builder'
import type { KnowledgeProviderQuery } from '@/features/intelligence/contracts/knowledge-provider.contract'
import type { ConnectorDocumentRecord } from '@/core/connectors'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { FinanceKnowledge } from '@/features/finance-knowledge/types/finance-knowledge.types'
import type { IdentityKnowledge } from '@/features/identity-knowledge/types/identity-knowledge.types'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import type { PropertyKnowledge } from '@/features/property-knowledge/types/property-knowledge.types'
import type { UploadedHealthReport } from '@/features/health/types'
import {
	applySearchContextRanking,
	type SearchContextModule,
} from '@/features/search/services/search-context.service'

export interface GlobalSearchInput {
	query: string
	userId: string
	member: IntelligenceMemberContext
	uploadedReports: UploadedHealthReport[]
	documents: ChronicleDocument[]
	connectorDocuments?: ConnectorDocumentRecord[]
	insuranceKnowledge?: InsuranceKnowledge | null
	financeKnowledge?: FinanceKnowledge | null
	identityKnowledge?: IdentityKnowledge | null
	vehicleKnowledge?: VehicleKnowledge | null
	propertyKnowledge?: PropertyKnowledge | null
	searchContext?: SearchContextModule | null
}

function buildSearchQuery(input: GlobalSearchInput): KnowledgeProviderQuery {
	const trimmed = input.query.trim()

	return {
		userId: input.userId,
		question: trimmed,
		resolvedQuestion: trimmed,
		intent: 'timeline_search',
		member: input.member,
		searchHits: [],
		sources: buildPlatformIntelligenceSources({
			uploadedReports: input.uploadedReports,
			documents: input.documents,
			connectorDocuments: input.connectorDocuments,
			insuranceKnowledge: input.insuranceKnowledge,
			financeKnowledge: input.financeKnowledge,
			identityKnowledge: input.identityKnowledge,
			vehicleKnowledge: input.vehicleKnowledge,
			propertyKnowledge: input.propertyKnowledge,
			userId: input.userId,
			familyMemberId: input.member.memberId,
		}),
	}
}

export function searchChronicle(input: GlobalSearchInput): SemanticSearchHit[] {
	const trimmed = input.query.trim()
	if (!trimmed) return []

	const providerQuery = buildSearchQuery(input)
	const hits: SemanticSearchHit[] = []

	for (const provider of getRegisteredProviders()) {
		if (!provider.search || !provider.supports(providerQuery)) {
			continue
		}

		try {
			hits.push(...provider.search(providerQuery))
		} catch {
			// Skip failed provider search.
		}
	}

	return applySearchContextRanking(
		rankSearchHits(hits, {
			memberId: input.member.memberId,
			queryTokens: tokenizeQuery(trimmed),
		}),
		input.searchContext ?? null,
	)
}

export function domainColor(domain: SemanticSearchHit['domain']): string {
	switch (domain) {
		case 'health':
			return '#10B981'
		case 'documents':
			return '#8B5CF6'
		case 'insurance':
			return '#0EA5E9'
		case 'finance':
			return '#30D158'
		case 'identity':
			return '#6366F1'
		case 'property':
			return '#F59E0B'
		case 'photos':
			return '#3B82F6'
		default:
			return '#6366F1'
	}
}

export function domainLabel(domain: SemanticSearchHit['domain']): string {
	switch (domain) {
		case 'health':
			return 'Health'
		case 'documents':
			return 'Documents'
		case 'insurance':
			return 'Insurance'
		case 'finance':
			return 'Finance'
		case 'identity':
			return 'Identity'
		case 'property':
			return 'Property'
		case 'travel':
			return 'Travel'
		case 'mail':
			return 'Mail'
		case 'photos':
			return 'Timeline'
		default:
			return 'Chronicle'
	}
}
