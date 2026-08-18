export type {
	IdentityAttentionItem,
	IdentityDocumentRecord,
	IdentityDocumentStatus,
	IdentityDocumentTypeId,
	IdentityHomeViewModel,
	IdentityKnowledge,
	IdentityMemberWallet,
	IdentitySetupStatus,
	IdentityTimelineEvent,
	IdentityVersionRole,
	IdentityWalletChip,
} from '@/features/identity-knowledge/types/identity-knowledge.types'

export {
	buildIdentityKnowledge,
	filterIdentityKnowledgeForMember,
} from '@/features/identity-knowledge/services/identity-knowledge.builder'
export { buildIdentityAttentionItems } from '@/features/identity-knowledge/services/identity-attention.service'
export {
	buildIdentityDocumentSummary,
	buildIdentityStatusLabel,
} from '@/features/identity-knowledge/services/identity-summary.service'
export {
	getIdentityTypeDefinition,
	IDENTITY_TYPE_REGISTRY,
	PRIMARY_IDENTITY_TYPE_IDS,
	resolveIdentityTypeId,
} from '@/features/identity-knowledge/services/identity-type.registry'
export { maskDocumentNumber } from '@/features/identity-knowledge/services/identity-mask.service'
export {
	readIdentityPreferences,
	writeIdentityPreferences,
} from '@/features/identity-knowledge/services/identity-preferences.service'
export {
	readIdentityVersionOverrides,
	setIdentityVersionOverride,
} from '@/features/identity-knowledge/services/identity-version.service'
export { isIdentityFolderPath } from '@/features/identity-knowledge/services/identity-member-resolver.service'
