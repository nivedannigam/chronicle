import type {
	ChronicleModuleProvider,
	ModuleDocumentSection,
	ModuleProviderQuery,
	ModuleSummary,
} from '@/core/platform/contracts/module-provider.contract'
import { toDocumentSummary } from '@/features/documents/services/document-intelligence.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

/** Categories owned by domain modules — excluded from the general library section. */
const MODULE_OWNED_CATEGORIES = new Set(['medical', 'insurance'])

function isGeneralLibraryDocument(document: ChronicleDocument): boolean {
	if (document.status === 'failed') {
		return false
	}

	return !MODULE_OWNED_CATEGORIES.has(document.category_id)
}

export const documentsModuleProvider: ChronicleModuleProvider = {
	moduleId: 'documents',
	label: 'Library',
	emoji: '📚',
	priority: 20,

	getDocumentSection(query: ModuleProviderQuery): ModuleDocumentSection | null {
		const memberNames = query.memberNames ?? {}
		const documents = (query.sources.documents?.uploadedDocuments ?? [])
			.filter(isGeneralLibraryDocument)
			.map((document) => toDocumentSummary(document, memberNames))

		if (documents.length === 0) {
			return null
		}

		const categoryCounts = new Map<string, { label: string; count: number }>()

		for (const document of documents) {
			const existing = categoryCounts.get(document.categoryId)

			if (existing) {
				existing.count += 1
			} else {
				categoryCounts.set(document.categoryId, {
					label: document.categoryLabel,
					count: 1,
				})
			}
		}

		return {
			moduleId: 'documents',
			label: 'Library',
			emoji: '📚',
			totalCount: documents.length,
			categories: [...categoryCounts.entries()].map(([id, value]) => ({
				id,
				label: value.label,
				count: value.count,
			})),
			documents,
		}
	},

	getSummary(query: ModuleProviderQuery): ModuleSummary | null {
		const count = (query.sources.documents?.uploadedDocuments ?? []).filter(
			isGeneralLibraryDocument,
		).length

		if (count === 0) {
			return null
		}

		return {
			moduleId: 'documents',
			label: 'Library',
			emoji: '📚',
			documentCount: count,
			headline: `${count} general document${count === 1 ? '' : 's'}`,
		}
	},
}
