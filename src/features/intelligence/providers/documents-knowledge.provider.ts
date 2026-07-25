import type { ConnectorDocumentRecord } from '@/core/connectors'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { fromRetrievedKnowledge } from '@/features/intelligence/adapters/retrieved-knowledge.adapter'
import type {
	ChronicleKnowledgeProvider,
	KnowledgeProviderQuery,
	ProviderContextResult,
} from '@/features/intelligence/contracts/knowledge-provider.contract'
import type {
	KnowledgeContextPackage,
	KnowledgeDocument,
	KnowledgeReference,
	KnowledgeTimelineEvent,
} from '@/features/intelligence/entities/knowledge-entities'
import { registerKnowledgeProvider } from '@/features/intelligence/registry/intelligence-registry'
import {
	extractTextSnippet,
	mergeSearchHits,
	scoreTextMatch,
	tokenizeQuery,
} from '@/features/intelligence/services/semantic-search.service'
import type { SemanticSearchHit } from '@/features/intelligence/types/intelligence.types'
import { documentsKnowledgeRetriever } from '@/features/knowledge/retrieval/documents-knowledge-retriever'
import type { RetrievalQuery } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import { getDocumentCategory } from '@/features/documents/types/document-categories'

const PROVIDER_ID = 'documents'

export interface DocumentsProviderSource {
	uploadedDocuments?: ChronicleDocument[]
	connectorDocuments?: ConnectorDocumentRecord[]
}

function getDocumentsSource(
	query: KnowledgeProviderQuery,
): DocumentsProviderSource {
	return (
		(query.sources[PROVIDER_ID] as DocumentsProviderSource | undefined) ?? {
			uploadedDocuments: [],
			connectorDocuments: [],
		}
	)
}

function getAllDocuments(query: KnowledgeProviderQuery): ChronicleDocument[] {
	const source = getDocumentsSource(query)
	return source.uploadedDocuments ?? []
}

function getConnectorRecords(
	query: KnowledgeProviderQuery,
): ConnectorDocumentRecord[] {
	return getDocumentsSource(query).connectorDocuments ?? []
}

function searchDocuments(input: {
	question: string
	documents: ChronicleDocument[]
}): SemanticSearchHit[] {
	const queryTokens = tokenizeQuery(input.question)
	const hits: SemanticSearchHit[] = []

	for (const document of input.documents) {
		const category = getDocumentCategory(document.category_id)
		const body = [
			document.title,
			document.file_name,
			document.document_number ?? '',
			document.issuer ?? '',
			category?.label ?? '',
			document.tags.join(' '),
			document.extracted_text ?? '',
			JSON.stringify(document.extracted_metadata),
		].join(' ')

		const score = scoreTextMatch(queryTokens, body)

		if (score <= 0) {
			continue
		}

		hits.push({
			id: `document-${document.id}`,
			domain: 'documents',
			kind: 'report',
			title: document.title,
			snippet: document.document_number
				? `${document.title} · ${document.document_number}`
				: document.title,
			score,
			reportId: document.id,
			date: document.issue_date ?? document.uploaded_at,
			reportType: document.category_id,
			memberId: document.family_member_id,
		})

		if (document.extracted_text) {
			hits.push({
				id: `document-ocr-${document.id}`,
				domain: 'documents',
				kind: 'entity',
				title: `${document.title} (text)`,
				snippet: extractTextSnippet(document.extracted_text, queryTokens),
				score: score + 0.2,
				reportId: document.id,
				date: document.issue_date ?? document.uploaded_at,
				reportType: document.category_id,
				memberId: document.family_member_id,
			})
		}
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
		documentCategoryId: query.categoryId,
		metricId: query.metricId,
		metricName: query.metricName,
		timeRangeYears: query.timeRangeYears,
		documents: getAllDocuments(query),
		connectorDocuments: getConnectorRecords(query),
		searchHits: query.searchHits,
		member: query.member,
	}
}

function loadDocumentsPackage(
	query: KnowledgeProviderQuery,
): KnowledgeContextPackage {
	const knowledge = documentsKnowledgeRetriever.retrieve(
		toRetrievalQuery(query),
	)
	const pkg = fromRetrievedKnowledge(knowledge, PROVIDER_ID)

	const documentHits =
		query.searchHits?.filter((hit) => hit.domain === 'documents') ?? []

	if (documentHits.length > 0 && pkg.summaryLines.length === 0) {
		pkg.summaryLines.push(
			`Found ${documentHits.length} related document${documentHits.length === 1 ? '' : 's'}.`,
		)
	}

	return pkg
}

export class DocumentsKnowledgeProvider implements ChronicleKnowledgeProvider {
	readonly id = PROVIDER_ID
	readonly domain = 'documents' as const
	readonly label = 'Documents'
	readonly priority = 20

	supports(query: KnowledgeProviderQuery): boolean {
		return (
			getAllDocuments(query).length > 0 || getConnectorRecords(query).length > 0
		)
	}

	search(query: KnowledgeProviderQuery): SemanticSearchHit[] {
		return searchDocuments({
			question: query.resolvedQuestion,
			documents: getAllDocuments(query),
		})
	}

	retrieveContext(query: KnowledgeProviderQuery): ProviderContextResult {
		if (!this.supports(query)) {
			return {
				providerId: this.id,
				domain: this.domain,
				available: false,
				package: null,
				unavailableReason:
					'No documents are available for this family member yet.',
			}
		}

		return {
			providerId: this.id,
			domain: this.domain,
			available: true,
			package: loadDocumentsPackage(query),
		}
	}

	retrieveTimeline(query: KnowledgeProviderQuery): KnowledgeTimelineEvent[] {
		if (!this.supports(query)) {
			return []
		}

		return loadDocumentsPackage(query).timelineEvents
	}

	retrieveEntities(query: KnowledgeProviderQuery): KnowledgeDocument[] {
		if (!this.supports(query)) {
			return []
		}

		return loadDocumentsPackage(query).documents
	}

	retrieveEvidence(query: KnowledgeProviderQuery): KnowledgeReference[] {
		if (!this.supports(query)) {
			return []
		}

		return loadDocumentsPackage(query).references
	}
}

export const documentsKnowledgeProvider = new DocumentsKnowledgeProvider()

registerKnowledgeProvider(documentsKnowledgeProvider)
