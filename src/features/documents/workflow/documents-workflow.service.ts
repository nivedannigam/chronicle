import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { updateDocumentRecord } from '@/features/documents/services/document.service'

export type DocumentWorkflowState =
	'processing' | 'active' | 'failed' | 'archived' | 'expired'

export async function transitionDocumentWorkflow(
	documentId: string,
	state: DocumentWorkflowState,
	detail?: string,
): Promise<ChronicleDocument> {
	return updateDocumentRecord(documentId, {
		status: state,
		...(detail
			? {
					extracted_metadata: {
						lastWorkflowTransition: state,
						lastWorkflowDetail: detail,
						lastWorkflowAt: new Date().toISOString(),
					},
				}
			: {}),
	})
}
