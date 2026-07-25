export { DocumentsLayout } from '@/features/documents/components/DocumentsLayout'
export { DocumentsPage } from '@/features/documents/pages/DocumentsPage'
export { DocumentsExpiringPage } from '@/features/documents/pages/DocumentsExpiringPage'
export { DocumentDetailPage } from '@/features/documents/pages/DocumentDetailPage'
export { useDocuments } from '@/features/documents/hooks/useDocuments'
export { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
export { useUploadDocument } from '@/features/documents/hooks/useUploadDocument'
export type { ChronicleDocument } from '@/features/documents/types/document.types'
export {
	DOCUMENT_CATEGORY_REGISTRY,
	getDocumentCategory,
	inferDocumentCategory,
} from '@/features/documents/types/document-categories'
