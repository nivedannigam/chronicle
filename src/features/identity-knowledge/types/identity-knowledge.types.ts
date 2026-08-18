export type IdentityDocumentTypeId =
	| 'passport'
	| 'aadhaar'
	| 'pan'
	| 'driving-licence'
	| 'voter-id'
	| 'birth-certificate'
	| 'marriage-certificate'
	| 'oci'
	| 'other'

export type IdentityDocumentStatus =
	| 'on_file'
	| 'valid_until'
	| 'expires_soon'
	| 'expired'
	| 'still_organizing'
	| 'needs_clearer_copy'
	| 'review_needed'

export type IdentityVersionRole = 'current' | 'previous' | 'unknown'

export interface IdentityDocumentRecord {
	id: string
	chronicleDocumentId: string
	typeId: IdentityDocumentTypeId
	typeLabel: string
	ownerMemberId: string | null
	ownerName: string
	title: string
	fileName: string
	documentNumber: string | null
	maskedDocumentNumber: string | null
	issueDate: string | null
	expiryDate: string | null
	issuer: string | null
	nationality: string | null
	dateOfBirth: string | null
	status: IdentityDocumentStatus
	versionRole: IdentityVersionRole
	consumerStatus: 'ready' | 'organizing' | 'needs_help'
	summary: string
	storagePath: string
	mimeType: string
	uploadedAt: string
	folderPath: string | null
	isPrimaryType: boolean
}

export interface IdentityAttentionItem {
	id: string
	documentId: string
	typeLabel: string
	ownerName: string
	headline: string
	subline: string
	tone: 'expired' | 'expiring'
}

export interface IdentityWalletChip {
	typeId: IdentityDocumentTypeId
	label: string
	checkmark: boolean
	statusLine: string | null
	hasAttention: boolean
}

export interface IdentityMemberWallet {
	memberId: string
	memberName: string
	avatarInitial: string
	primaryChips: IdentityWalletChip[]
	overflowCount: number
	overflowLabel: string | null
	documentCount: number
}

export interface IdentityTimelineEvent {
	id: string
	documentId: string
	title: string
	timestamp: string
	eventType: 'issued' | 'renewed' | 'added' | 'expiry'
}

export interface IdentityKnowledge {
	userId: string
	documents: IdentityDocumentRecord[]
	attentionItems: IdentityAttentionItem[]
	memberWallets: IdentityMemberWallet[]
	documentCount: number
	hasDocuments: boolean
	isOrganizing: boolean
	timelineEvents: IdentityTimelineEvent[]
}

export type IdentitySetupStatus =
	'not_connected' | 'scanning' | 'empty' | 'organizing' | 'ready'

export interface IdentityHomeViewModel {
	setupStatus: IdentitySetupStatus
	statusHeadline: string
	statusSubline: string | null
	attentionItems: IdentityAttentionItem[]
	memberWallets: IdentityMemberWallet[]
	askSuggestions: string[]
	showLibraryLink: boolean
}
