import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import { insuranceKnowledgeRetriever } from '@/features/knowledge/retrieval/insurance-knowledge-retriever'
import type { RetrievalQuery } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import { insuranceKnowledgeProvider } from '@/features/insurance-knowledge'
import type { InsuranceProviderSource } from '@/features/insurance/providers/insurance-provider-source.types'
import type {
	ChronicleKnowledgeProvider,
	KnowledgeContextPackage,
	KnowledgeDocument,
	KnowledgeProviderQuery,
	KnowledgeReference,
	KnowledgeTimelineEvent,
	ProviderContextResult,
	SemanticSearchHit,
} from '@chronicle/core-knowledge'
import { fromRetrievedKnowledge } from '@chronicle/core-knowledge'
import {
	extractTextSnippet,
	mergeSearchHits,
	registerKnowledgeProvider,
	scoreTextMatch,
	tokenizeQuery,
} from '@chronicle/core-search'

const PROVIDER_ID = 'insurance'

function getInsuranceSource(
	query: KnowledgeProviderQuery,
): InsuranceProviderSource | undefined {
	return query.sources[PROVIDER_ID] as InsuranceProviderSource | undefined
}

function resolveInsuranceKnowledge(
	query: KnowledgeProviderQuery,
): InsuranceKnowledge | null {
	const source = getInsuranceSource(query)

	if (source?.knowledge) {
		return source.knowledge
	}

	if (source?.rawData && source.userId) {
		return insuranceKnowledgeProvider.buildFromRawData(source.rawData, {
			userId: source.userId,
			familyMemberId: source.familyMemberId ?? null,
			accountOwnerMemberId: source.accountOwnerMemberId ?? null,
		})
	}

	return null
}

function hasInsuranceData(knowledge: InsuranceKnowledge | null): boolean {
	if (!knowledge) {
		return false
	}

	return (
		knowledge.policies.length > 0 ||
		knowledge.claims.length > 0 ||
		knowledge.documents.length > 0
	)
}

function searchInsurance(input: {
	question: string
	knowledge: InsuranceKnowledge
	memberId: string | null
}): SemanticSearchHit[] {
	const queryTokens = tokenizeQuery(input.question)
	const hits: SemanticSearchHit[] = []

	for (const policy of input.knowledge.policies) {
		const body = [
			policy.policyNumber,
			policy.productName ?? '',
			policy.insurerName,
			policy.policyType,
			policy.categoryId,
			policy.status,
		].join(' ')

		const score = scoreTextMatch(queryTokens, body)

		if (score <= 0) {
			continue
		}

		hits.push({
			id: `insurance-policy-${policy.id}`,
			domain: 'insurance',
			kind: 'report',
			title: policy.productName ?? policy.policyNumber,
			snippet: [policy.insurerName, policy.policyNumber, policy.status]
				.filter(Boolean)
				.join(' · '),
			score,
			reportId: policy.id,
			date: policy.inceptionDate ?? policy.expiryDate ?? undefined,
			reportType: policy.policyType,
			memberId: input.memberId,
		})
	}

	for (const claim of input.knowledge.claims) {
		const body = [
			claim.claimNumber ?? '',
			claim.claimType,
			claim.status,
			claim.providerName ?? '',
		].join(' ')

		const score = scoreTextMatch(queryTokens, body)

		if (score <= 0) {
			continue
		}

		hits.push({
			id: `insurance-claim-${claim.id}`,
			domain: 'insurance',
			kind: 'entity',
			title: claim.claimNumber ?? 'Insurance claim',
			snippet: [claim.claimType, claim.status].filter(Boolean).join(' · '),
			score,
			reportId: claim.id,
			date: claim.filedDate ?? claim.settledDate ?? undefined,
			reportType: 'claim',
		})
	}

	for (const document of input.knowledge.documents) {
		const body = [
			document.fileName,
			document.documentKind,
			document.linkedPolicyIds.join(' '),
		].join(' ')

		const score = scoreTextMatch(queryTokens, body)

		if (score <= 0) {
			continue
		}

		hits.push({
			id: `insurance-document-${document.id}`,
			domain: 'insurance',
			kind: 'entity',
			title: document.fileName,
			snippet: extractTextSnippet(body, queryTokens),
			score,
			reportId: document.id,
			date: document.uploadedAt,
			reportType: document.documentKind,
		})
	}

	return mergeSearchHits(hits)
}

function toRetrievalQuery(query: KnowledgeProviderQuery): RetrievalQuery {
	return {
		userId: query.userId,
		question: query.question,
		intent: query.intent,
		resolvedQuestion: query.resolvedQuestion,
		categoryId: query.categoryId,
		member: query.member,
		sources: query.sources,
		searchHits: query.searchHits,
	}
}

function loadInsurancePackage(
	query: KnowledgeProviderQuery,
): KnowledgeContextPackage {
	const knowledge = resolveInsuranceKnowledge(query)

	if (!knowledge) {
		return fromRetrievedKnowledge(
			{
				domain: 'insurance',
				intent: query.intent,
				reports: [],
				metrics: [],
				timelines: [],
				trends: [],
				observations: [],
				relationships: [],
				insights: [],
				alerts: [],
				summaryLines: [],
				comparisons: [],
			},
			PROVIDER_ID,
		)
	}

	const retrieved = insuranceKnowledgeRetriever.retrieve(
		toRetrievalQuery(query),
	)
	const pkg = fromRetrievedKnowledge(retrieved, PROVIDER_ID)

	const insuranceHits =
		query.searchHits?.filter((hit) => hit.domain === 'insurance') ?? []

	if (insuranceHits.length > 0 && pkg.summaryLines.length === 0) {
		pkg.summaryLines.push(
			`Found ${insuranceHits.length} related insurance item${insuranceHits.length === 1 ? '' : 's'}.`,
		)
	}

	return pkg
}

export class InsuranceIntelligenceProvider implements ChronicleKnowledgeProvider {
	readonly id = PROVIDER_ID
	readonly domain = 'insurance' as const
	readonly label = 'Insurance'
	readonly priority = 15

	supports(query: KnowledgeProviderQuery): boolean {
		return hasInsuranceData(resolveInsuranceKnowledge(query))
	}

	search(query: KnowledgeProviderQuery): SemanticSearchHit[] {
		const knowledge = resolveInsuranceKnowledge(query)

		if (!knowledge) {
			return []
		}

		return searchInsurance({
			question: query.resolvedQuestion,
			knowledge,
			memberId: query.member.memberId,
		})
	}

	retrieveContext(query: KnowledgeProviderQuery): ProviderContextResult {
		const knowledge = resolveInsuranceKnowledge(query)

		if (!hasInsuranceData(knowledge)) {
			return {
				providerId: this.id,
				domain: this.domain,
				available: false,
				package: null,
				unavailableReason:
					'No insurance policies or claims are available for this family member yet.',
			}
		}

		return {
			providerId: this.id,
			domain: this.domain,
			available: true,
			package: loadInsurancePackage(query),
		}
	}

	retrieveTimeline(query: KnowledgeProviderQuery): KnowledgeTimelineEvent[] {
		if (!this.supports(query)) {
			return []
		}

		return loadInsurancePackage(query).timelineEvents
	}

	retrieveEntities(query: KnowledgeProviderQuery): KnowledgeDocument[] {
		if (!this.supports(query)) {
			return []
		}

		return loadInsurancePackage(query).documents
	}

	retrieveEvidence(query: KnowledgeProviderQuery): KnowledgeReference[] {
		if (!this.supports(query)) {
			return []
		}

		return loadInsurancePackage(query).references
	}
}

export const insuranceIntelligenceProvider = new InsuranceIntelligenceProvider()

registerKnowledgeProvider(insuranceIntelligenceProvider)
