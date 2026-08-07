import type { FederatedLibraryView } from '@/core/platform/contracts/module-provider.contract'
import { useDocumentsContextOptional } from '@/features/documents/context/DocumentsContext'

export function useFederatedLibrary(): FederatedLibraryView & {
	isLoading: boolean
} {
	const context = useDocumentsContextOptional()

	if (!context) {
		return {
			sections: [],
			allDocuments: [],
			totalCount: 0,
			moduleSummaries: [],
			isLoading: false,
		}
	}

	return {
		...context.federated,
		isLoading: context.isLoading,
	}
}
