import {
	extractTextSnippet,
	mergeSearchHits,
	scoreTextMatch,
	tokenizeQuery,
} from '@/features/intelligence/services/semantic-search.service'
import { createEmptyKnowledge } from '@/features/intelligence/types/intelligence.types'
import type {
	ChronicleKnowledgeProvider,
	KnowledgeProviderContext,
	KnowledgeProviderResult,
	SemanticSearchHit,
} from '@/features/intelligence/types/intelligence.types'

function filterDocumentsForMember(
	context: KnowledgeProviderContext,
): NonNullable<KnowledgeProviderContext['connectorDocuments']> {
	const documents = context.connectorDocuments ?? []
	const memberId = context.member.memberId

	if (!memberId) {
		return documents
	}

	return documents.filter(
		(document) =>
			!document.familyMemberId || document.familyMemberId === memberId,
	)
}

export class DocumentsKnowledgeProvider implements ChronicleKnowledgeProvider {
	readonly domain = 'documents' as const
	readonly label = 'Documents'

	isAvailable(context: KnowledgeProviderContext): boolean {
		return filterDocumentsForMember(context).length > 0
	}

	search(context: KnowledgeProviderContext): SemanticSearchHit[] {
		const queryTokens = tokenizeQuery(context.resolvedQuestion)
		const documents = filterDocumentsForMember(context)
		const hits: SemanticSearchHit[] = []

		for (const document of documents) {
			const body = [
				document.fileName,
				document.folderPath ?? '',
				document.discoveryCategory ?? '',
				document.detectedReportType ?? '',
				document.detectedPatient ?? '',
			].join(' ')

			const score = scoreTextMatch(queryTokens, body)

			if (score <= 0) {
				continue
			}

			hits.push({
				id: `document-${document.id}`,
				domain: 'documents',
				kind: 'report',
				title: document.fileName,
				snippet: extractTextSnippet(body, queryTokens),
				score,
				reportId: document.healthReportId ?? undefined,
				date:
					document.detectedReportDate ??
					document.externalModifiedAt ??
					document.lastSyncAt ??
					undefined,
			})
		}

		return mergeSearchHits(hits)
	}

	retrieve(context: KnowledgeProviderContext): KnowledgeProviderResult {
		const documents = filterDocumentsForMember(context)

		if (documents.length === 0) {
			return {
				domain: 'documents',
				available: false,
				knowledge: null,
				unavailableReason:
					'No synced documents are available in Chronicle yet. Connect Google Drive to import documents.',
			}
		}

		const hits =
			context.searchHits?.filter((hit) => hit.domain === 'documents') ??
			this.search(context)
		const knowledge = createEmptyKnowledge(context.intent, 'documents')

		if (hits.length === 0) {
			knowledge.summaryLines.push(
				`Chronicle has ${documents.length} synced document${documents.length === 1 ? '' : 's'} from Google Drive, but none matched this question.`,
			)
		} else {
			knowledge.summaryLines.push(
				`Found ${hits.length} matching document${hits.length === 1 ? '' : 's'} in your Google Drive records.`,
			)

			for (const hit of hits.slice(0, 4)) {
				knowledge.insights.push(`${hit.title}: ${hit.snippet}`)
			}
		}

		return {
			domain: 'documents',
			available: true,
			knowledge,
		}
	}
}

export const documentsKnowledgeProvider = new DocumentsKnowledgeProvider()
