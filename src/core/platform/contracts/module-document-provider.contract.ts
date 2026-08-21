import type { PlatformModuleId } from '@/core/platform/contracts/platform-module.contract'
import type {
	ChronicleDocumentSummary,
	DocumentConsumerStatus,
} from '@/features/documents/types/document-intelligence.types'

/** Canonical fields every module document adapter must supply for Universal Library. */
export interface ModuleLibraryDocumentInput {
	canonicalId: string
	moduleId: PlatformModuleId | 'documents'
	categoryId: string
	categoryLabel: string
	title: string
	displayName?: string
	documentType?: string | null
	sourceLabel: string
	displayDate: string
	summary: string
	familyMemberId?: string | null
	ownerLabel: string
	moduleDetailPath: string
	moduleDetailLabel: string
	sourceKey: string
	fileType?: string
	expiresLabel?: string | null
	isExpiringSoon?: boolean
	isExpired?: boolean
	hasAiSummary?: boolean
	tags?: string[]
	consumerStatus?: DocumentConsumerStatus
	year?: number | null
	/** When set, masks sensitive values in Library search/cards. */
	privacySensitive?: boolean
}

export interface ModuleLibraryMemberScope {
	memberId?: string | null
	accountOwnerMemberId?: string | null
}

export type ModuleLibraryDocumentAdapter = (
	input: ModuleLibraryDocumentInput,
) => ChronicleDocumentSummary
