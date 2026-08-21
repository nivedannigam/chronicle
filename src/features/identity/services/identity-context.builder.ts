import type {
	IdentityAttentionItem,
	IdentityHomeViewModel,
	IdentityKnowledge,
	IdentityMemberWallet,
	IdentitySetupStatus,
} from '@/features/identity-knowledge/types/identity-knowledge.types'
import {
	buildIdentityAttentionItems,
	countIdentityAttentionItems,
} from '@/features/identity-knowledge/services/identity-attention.service'

export interface IdentityContextValue {
	knowledge: IdentityKnowledge
	home: IdentityHomeViewModel
	setupStatus: IdentitySetupStatus
	hasFolderAssigned: boolean
	isLoading: boolean
	isError: boolean
	refetch: () => void
}

const ASK_SUGGESTIONS = [
	'When does my passport expire?',
	'Which documents expire this year?',
	'Does Advika have a passport?',
]

function resolveSetupStatus(input: {
	hasFolderAssigned: boolean
	knowledge: IdentityKnowledge
	isLoading: boolean
	isScanning: boolean
}): IdentitySetupStatus {
	if (!input.hasFolderAssigned) {
		return 'not_connected'
	}

	if (input.isScanning || (input.isLoading && !input.knowledge.hasDocuments)) {
		return 'scanning'
	}

	if (!input.knowledge.hasDocuments && !input.knowledge.isOrganizing) {
		return 'empty'
	}

	if (input.knowledge.isOrganizing) {
		return 'organizing'
	}

	return 'ready'
}

function buildStatusHeadline(input: {
	setupStatus: IdentitySetupStatus
	attentionCount: number
	memberName: string | null
}): { headline: string; subline: string | null } {
	switch (input.setupStatus) {
		case 'not_connected':
			return {
				headline: 'Connect your Identity folder to begin',
				subline: null,
			}
		case 'scanning':
			return {
				headline: 'Looking for identity documents…',
				subline: null,
			}
		case 'empty':
			return {
				headline: 'No identity documents found yet',
				subline:
					'Add passports, PAN cards, and other IDs to your Identity folder.',
			}
		case 'organizing':
			return {
				headline: 'Still organizing your documents',
				subline: null,
			}
		default:
			if (input.attentionCount > 0) {
				return {
					headline: `${input.attentionCount} document${input.attentionCount === 1 ? '' : 's'} need attention`,
					subline: null,
				}
			}

			if (input.memberName) {
				return {
					headline: `All set for ${input.memberName}`,
					subline: null,
				}
			}

			return {
				headline: 'All set for your family',
				subline: null,
			}
	}
}

export function buildIdentityContextValue(input: {
	knowledge: IdentityKnowledge
	hasFolderAssigned: boolean
	isLoading: boolean
	isError: boolean
	refetch: () => void
	isScanning?: boolean
	selectedMemberId?: string | null
	selectedMemberName?: string | null
}): IdentityContextValue {
	const setupStatus = resolveSetupStatus({
		hasFolderAssigned: input.hasFolderAssigned,
		knowledge: input.knowledge,
		isLoading: input.isLoading,
		isScanning: input.isScanning ?? false,
	})

	const currentDocuments = input.knowledge.documents.filter(
		(document) => document.versionRole !== 'previous',
	)

	const filteredDocuments = input.selectedMemberId
		? currentDocuments.filter(
				(document) => document.ownerMemberId === input.selectedMemberId,
			)
		: currentDocuments

	const attentionItems: IdentityAttentionItem[] =
		setupStatus === 'ready' || setupStatus === 'organizing'
			? buildIdentityAttentionItems(filteredDocuments)
			: []

	const attentionCount = countIdentityAttentionItems(filteredDocuments)

	const memberWallets: IdentityMemberWallet[] = input.knowledge.memberWallets
		.filter((wallet) => wallet.documentCount > 0)
		.filter(
			(wallet) =>
				!input.selectedMemberId || wallet.memberId === input.selectedMemberId,
		)

	const status = buildStatusHeadline({
		setupStatus,
		attentionCount,
		memberName: input.selectedMemberName ?? null,
	})

	const scopeSubline = input.selectedMemberId
		? input.selectedMemberName
			? `Showing ${input.selectedMemberName}'s documents · ${filteredDocuments.length} current`
			: `Showing selected member · ${filteredDocuments.length} current`
		: status.subline

	return {
		knowledge: input.knowledge,
		setupStatus,
		hasFolderAssigned: input.hasFolderAssigned,
		isLoading: input.isLoading,
		isError: input.isError,
		refetch: input.refetch,
		home: {
			setupStatus,
			statusHeadline: status.headline,
			statusSubline: scopeSubline,
			attentionItems,
			memberWallets,
			askSuggestions: ASK_SUGGESTIONS,
			showLibraryLink:
				input.knowledge.hasDocuments &&
				(setupStatus === 'ready' || setupStatus === 'organizing'),
		},
	}
}
