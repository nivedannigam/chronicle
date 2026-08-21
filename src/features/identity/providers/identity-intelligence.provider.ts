import {
	buildIdentityKnowledge,
	filterIdentityKnowledgeForMember,
} from '@/features/identity-knowledge'
import type { IdentityKnowledge } from '@/features/identity-knowledge/types/identity-knowledge.types'
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

const PROVIDER_ID = 'identity'

function resolveIdentityKnowledge(
	query: KnowledgeProviderQuery,
): IdentityKnowledge | null {
	const source = query.sources[PROVIDER_ID] as
		| {
				knowledge?: IdentityKnowledge
				documents?: ChronicleDocument[]
				userId?: string
				accountOwnerMemberId?: string | null
				familyMemberId?: string | null
		  }
		| undefined

	if (source?.knowledge) {
		return filterIdentityKnowledgeForMember(
			source.knowledge,
			query.member?.memberId ?? source.familyMemberId ?? null,
		)
	}

	if (source?.documents && source.userId) {
		const knowledge = buildIdentityKnowledge({
			userId: source.userId,
			documents: source.documents,
			members: [],
			accountOwnerMemberId: source.accountOwnerMemberId ?? null,
		})

		return filterIdentityKnowledgeForMember(
			knowledge,
			query.member?.memberId ?? source.familyMemberId ?? null,
		)
	}

	return null
}

function searchIdentityRecords(input: {
	question: string
	knowledge: IdentityKnowledge
}): SemanticSearchHit[] {
	const tokens = tokenizeQuery(input.question)
	const hits: SemanticSearchHit[] = []
	const seenOwners = new Set<string>()

	for (const wallet of input.knowledge.memberWallets) {
		if (seenOwners.has(wallet.memberId)) {
			continue
		}

		const body = [wallet.memberName, 'identity wallet', 'person'].join(' ')
		const score = scoreTextMatch(tokens, body)

		if (score <= 0) {
			continue
		}

		seenOwners.add(wallet.memberId)
		hits.push({
			id: `identity-person-${wallet.memberId}`,
			domain: 'identity',
			kind: 'entity',
			title: wallet.memberName,
			snippet: `Identity · ${wallet.memberName}`,
			score,
			reportId: wallet.memberId,
			reportType: 'person',
			memberId: wallet.memberId,
		})
	}

	for (const document of input.knowledge.documents) {
		if (document.versionRole === 'previous') {
			continue
		}

		const body = [
			document.typeLabel,
			document.title,
			document.fileName,
			document.ownerName,
			document.maskedDocumentNumber ?? '',
			document.issuer ?? '',
			document.summary,
		].join(' ')
		const score = scoreTextMatch(tokens, body)

		if (score <= 0) {
			continue
		}

		hits.push({
			id: `identity-doc-${document.id}`,
			domain: 'identity',
			kind: 'report',
			title: document.typeLabel,
			snippet: `Identity · ${document.ownerName}`,
			score,
			reportId: document.chronicleDocumentId,
			reportType: document.typeId,
			memberId: document.ownerMemberId,
			date: document.expiryDate ?? document.issueDate ?? undefined,
		})
	}

	for (const event of input.knowledge.timelineEvents) {
		const body = [event.title, event.eventType].join(' ')
		const score = scoreTextMatch(tokens, body)

		if (score <= 0) {
			continue
		}

		const document = input.knowledge.documents.find(
			(entry) => entry.id === event.documentId,
		)

		hits.push({
			id: `identity-event-${event.id}`,
			domain: 'identity',
			kind: 'timeline',
			title: event.title,
			snippet: document
				? `Identity · ${document.ownerName}`
				: 'Identity · Document',
			score,
			reportId: document?.chronicleDocumentId ?? event.documentId,
			reportType: document?.typeId ?? 'other',
			memberId: document?.ownerMemberId ?? null,
			date: event.timestamp,
		})
	}

	return hits
}

class IdentityIntelligenceProvider implements ChronicleKnowledgeProvider {
	readonly id = PROVIDER_ID
	readonly domain = 'identity' as const
	readonly label = 'Identity'
	readonly priority = 13

	supports(query: KnowledgeProviderQuery): boolean {
		const knowledge = resolveIdentityKnowledge(query)
		return Boolean(knowledge?.hasDocuments)
	}

	search(query: KnowledgeProviderQuery): SemanticSearchHit[] {
		const knowledge = resolveIdentityKnowledge(query)
		if (!knowledge) {
			return []
		}

		return searchIdentityRecords({
			question: query.resolvedQuestion,
			knowledge,
		})
	}

	retrieveContext(query: KnowledgeProviderQuery): ProviderContextResult {
		const knowledge = resolveIdentityKnowledge(query)

		if (!knowledge) {
			return {
				providerId: this.id,
				domain: this.domain,
				available: false,
				package: null,
				unavailableReason: 'No identity documents are available yet.',
			}
		}

		return {
			providerId: this.id,
			domain: this.domain,
			available: true,
			package: {
				...createEmptyContextPackage(),
				summaryLines: [
					`${knowledge.documentCount} identity document${knowledge.documentCount === 1 ? '' : 's'} organized.`,
					...knowledge.attentionItems
						.slice(0, 2)
						.map((item) => `${item.headline} · ${item.ownerName}`),
				],
			},
		}
	}
}

export const identityIntelligenceProvider = new IdentityIntelligenceProvider()

registerKnowledgeProvider(identityIntelligenceProvider)
