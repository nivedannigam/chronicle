import type { FinanceKnowledge } from '@/features/finance-knowledge/types/finance-knowledge.types'
import { buildFinanceKnowledge } from '@/features/finance-knowledge'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type {
	ChronicleKnowledgeProvider,
	KnowledgeProviderQuery,
	ProviderContextResult,
	SemanticSearchHit,
} from '@chronicle/core-knowledge'
import { createEmptyContextPackage } from '@chronicle/core-knowledge'
import {
	registerKnowledgeProvider,
	scoreTextMatch,
	tokenizeQuery,
} from '@chronicle/core-search'

const PROVIDER_ID = 'finance'

function resolveFinanceKnowledge(
	query: KnowledgeProviderQuery,
): FinanceKnowledge | null {
	const source = query.sources[PROVIDER_ID] as
		| {
				knowledge?: FinanceKnowledge
				documents?: ChronicleDocument[]
				userId?: string
				hasFolderAssigned?: boolean
		  }
		| undefined

	if (source?.knowledge) {
		return source.knowledge
	}

	if (source?.documents && source.userId) {
		return buildFinanceKnowledge({
			userId: source.userId,
			documents: source.documents,
			members: [],
			hasFolderAssigned: source.hasFolderAssigned ?? false,
		})
	}

	return null
}

function searchFinanceDocuments(input: {
	question: string
	knowledge: FinanceKnowledge
}): SemanticSearchHit[] {
	const tokens = tokenizeQuery(input.question)
	const hits: SemanticSearchHit[] = []

	const entityRecords = [
		...input.knowledge.bankAccounts,
		...input.knowledge.creditCards,
		...input.knowledge.loans,
		...input.knowledge.investmentAccounts,
	]

	for (const entity of entityRecords) {
		const body = [
			entity.displayName,
			entity.institutionName ?? '',
			entity.maskedIdentifier ?? '',
			entity.kind,
		].join(' ')
		const score = scoreTextMatch(tokens, body)

		if (score <= 0) {
			continue
		}

		hits.push({
			id: `finance-entity-${entity.id}`,
			domain: 'finance',
			kind: 'entity',
			title: entity.displayName,
			snippet: `Finance · ${entity.displayName}`,
			score,
			reportId: entity.id,
			reportType: entity.kind,
			memberId: entity.ownerMemberIds[0] ?? null,
		})
	}

	for (const document of input.knowledge.documents) {
		const body = [
			document.displayLabel,
			document.fileName,
			document.title,
			document.subCategoryLabel ?? '',
			document.folderPath ?? '',
		].join(' ')
		const score = scoreTextMatch(tokens, body)

		if (score <= 0) {
			continue
		}

		hits.push({
			id: `finance-doc-${document.id}`,
			domain: 'finance',
			kind: 'report',
			title: document.displayLabel,
			snippet: `Finance · ${document.subCategoryLabel ?? 'Document'}`,
			score,
			reportId: document.chronicleDocumentId,
			reportType: document.subCategoryId ?? 'other',
			memberId: document.ownerMemberId,
		})
	}

	for (const event of input.knowledge.timeline) {
		const body = [
			event.title,
			event.description,
			event.entityDisplayName ?? '',
			event.eventType,
		].join(' ')
		const score = scoreTextMatch(tokens, body)

		if (score <= 0) {
			continue
		}

		hits.push({
			id: `finance-event-${event.id}`,
			domain: 'finance',
			kind: 'timeline',
			title: event.title,
			snippet: `Finance · ${event.entityDisplayName ?? 'Event'}`,
			score,
			reportId: event.entityId ?? event.id,
			reportType: event.eventType,
			memberId: event.ownerMemberIds[0] ?? null,
			date: event.eventDate,
		})
	}

	return hits
}

class FinanceIntelligenceProvider implements ChronicleKnowledgeProvider {
	readonly id = PROVIDER_ID
	readonly domain = 'finance' as const
	readonly label = 'Finance'
	readonly priority = 14

	supports(query: KnowledgeProviderQuery): boolean {
		return resolveFinanceKnowledge(query) != null
	}

	search(query: KnowledgeProviderQuery): SemanticSearchHit[] {
		const knowledge = resolveFinanceKnowledge(query)
		if (!knowledge) {
			return []
		}

		return searchFinanceDocuments({
			question: query.resolvedQuestion,
			knowledge,
		})
	}

	retrieveContext(query: KnowledgeProviderQuery): ProviderContextResult {
		const knowledge = resolveFinanceKnowledge(query)

		if (!knowledge) {
			return {
				providerId: this.id,
				domain: this.domain,
				available: false,
				package: null,
				unavailableReason: 'No finance documents are available yet.',
			}
		}

		return {
			providerId: this.id,
			domain: this.domain,
			available: true,
			package: {
				...createEmptyContextPackage(),
				summaryLines: [
					`${knowledge.documentCount} financial document${knowledge.documentCount === 1 ? '' : 's'} organized.`,
					...(knowledge.summary.subline ? [knowledge.summary.subline] : []),
					...knowledge.timeline
						.slice(0, 3)
						.map((event) => `${event.title} · ${event.eventDate}`),
				],
			},
		}
	}
}

export const financeIntelligenceProvider = new FinanceIntelligenceProvider()

registerKnowledgeProvider(financeIntelligenceProvider)
