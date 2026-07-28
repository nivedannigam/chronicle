import { getRegisteredProviders } from '@/features/intelligence/registry/intelligence-registry'
import { rankSearchHits } from '@/features/intelligence/services/search-ranking.service'
import { tokenizeQuery } from '@/features/intelligence/services/semantic-search.service'
import type {
	IntelligenceMemberContext,
	SemanticSearchHit,
} from '@/features/intelligence/types/intelligence.types'
import { buildIntelligenceSources } from '@/features/intelligence/types/intelligence.types'
import type { KnowledgeProviderQuery } from '@/features/intelligence/contracts/knowledge-provider.contract'
import type { ConnectorDocumentRecord } from '@/core/connectors'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { UploadedHealthReport } from '@/features/health/types'

export interface GlobalSearchInput {
	query: string
	userId: string
	member: IntelligenceMemberContext
	uploadedReports: UploadedHealthReport[]
	documents: ChronicleDocument[]
	connectorDocuments?: ConnectorDocumentRecord[]
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
		sources: buildIntelligenceSources({
			uploadedReports: input.uploadedReports,
			documents: input.documents,
			connectorDocuments: input.connectorDocuments,
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

	return rankSearchHits(hits, {
		memberId: input.member.memberId,
		queryTokens: tokenizeQuery(trimmed),
	})
}

export function domainColor(domain: SemanticSearchHit['domain']): string {
	switch (domain) {
		case 'health':
			return '#10B981'
		case 'documents':
			return '#8B5CF6'
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
		case 'finance':
			return 'Finance'
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
