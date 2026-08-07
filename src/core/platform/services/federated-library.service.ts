import type {
	FederatedLibraryView,
	ModuleProviderQuery,
} from '@/core/platform/contracts/module-provider.contract'
import { getRegisteredModuleProviders } from '@/core/platform/registries/module-provider-registry'
import type { ChronicleDocumentSummary } from '@/features/documents/types/document-intelligence.types'

function dedupeDocuments(
	documents: ChronicleDocumentSummary[],
): ChronicleDocumentSummary[] {
	const seen = new Set<string>()
	const deduped: ChronicleDocumentSummary[] = []

	for (const document of documents) {
		if (seen.has(document.id)) {
			continue
		}

		seen.add(document.id)
		deduped.push(document)
	}

	return deduped
}

/** Aggregates documents from all registered module providers — no duplicate indexing. */
export function buildFederatedLibraryView(
	query: ModuleProviderQuery,
): FederatedLibraryView {
	const sections = getRegisteredModuleProviders()
		.map((provider) => provider.getDocumentSection(query))
		.filter((section) => section != null)

	const allDocuments = dedupeDocuments(
		sections.flatMap((section) => section.documents),
	)

	const moduleSummaries = getRegisteredModuleProviders()
		.map((provider) => provider.getSummary?.(query))
		.filter((summary) => summary != null)

	return {
		sections,
		allDocuments,
		totalCount: allDocuments.length,
		moduleSummaries,
	}
}
