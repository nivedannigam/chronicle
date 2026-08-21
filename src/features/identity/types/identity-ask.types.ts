import type { IdentityDocumentTypeId } from '@/features/identity-knowledge/types/identity-knowledge.types'

export interface IdentityAskScope {
	documentId?: string
	typeId?: IdentityDocumentTypeId
	memberId?: string | null
}
