export { DocumentsLayout } from '@/features/documents/components/DocumentsLayout'
export { DocumentsPage } from '@/features/documents/pages/DocumentsPage'
export { DocumentsCategoryPage } from '@/features/documents/pages/DocumentsCategoryPage'
export { DocumentsExpiringPage } from '@/features/documents/pages/DocumentsExpiringPage'
export { DocumentDetailPage } from '@/features/documents/pages/DocumentDetailPage'
export { useDocuments } from '@/features/documents/hooks/useDocuments'
export { useDocumentIntelligence } from '@/features/documents/hooks/useDocumentIntelligence'
export { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
export { useUploadDocument } from '@/features/documents/hooks/useUploadDocument'
export type { ChronicleDocument } from '@/features/documents/types/document.types'
export type {
	ChronicleDocumentSummary,
	DocumentAttentionItem,
	DocumentIntelligenceView,
	DocumentsHubView,
} from '@/features/documents/types/document-intelligence.types'
export {
	DOCUMENT_CATEGORY_REGISTRY,
	getDocumentCategory,
	inferDocumentCategory,
} from '@/features/documents/types/document-categories'
export {
	buildDocumentIntelligenceView,
	buildDocumentsHubView,
	searchDocumentsLocal,
} from '@/features/documents/services/document-intelligence.service'
export {
	DOCUMENT_HOME_CATEGORIES,
	FUTURE_DOCUMENT_MODULES,
} from '@/features/documents/constants/document-category-display'
