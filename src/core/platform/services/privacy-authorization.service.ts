import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import {
	resolveResourcePrivacyScope,
	type PrivacyScope,
	type PrivacyScopedResource,
} from '@/core/platform/contracts/privacy-scope.contract'

export interface MemberAccessContext {
	viewerMemberId: string | null
	accountOwnerMemberId: string | null
}

function memberNames(member: FamilyMemberWithAliases): string[] {
	return [member.displayName, ...member.aliases]
		.map((name) => name.trim())
		.filter((name) => name.length > 2)
}

export function findMemberMentionedInText(
	members: FamilyMemberWithAliases[],
	text: string,
): FamilyMemberWithAliases | null {
	const normalized = text.toLowerCase()

	const matches = members.filter((member) =>
		memberNames(member).some((name) => normalized.includes(name.toLowerCase())),
	)

	if (matches.length !== 1) {
		return null
	}

	return matches[0] ?? null
}

export function canViewerAccessResource(
	resource: PrivacyScopedResource,
	context: MemberAccessContext,
): boolean {
	const scope: PrivacyScope = resolveResourcePrivacyScope(resource)

	if (scope === 'shared') {
		return true
	}

	if (context.viewerMemberId == null) {
		return true
	}

	if (scope === 'account') {
		return context.viewerMemberId === context.accountOwnerMemberId
	}

	return resource.familyMemberId === context.viewerMemberId
}

export function filterResourcesForMember<T extends PrivacyScopedResource>(
	resources: T[],
	context: MemberAccessContext,
): T[] {
	if (context.viewerMemberId == null) {
		return resources
	}

	return resources.filter((resource) =>
		canViewerAccessResource(resource, context),
	)
}

export type AskAuthorizationStatus = 'ALLOWED' | 'RESTRICTED'

export interface AskAuthorizationResult {
	status: AskAuthorizationStatus
	viewerMemberId: string | null
	viewerMemberName: string | null
	/** Member scope used for retrieval — never crosses privacy boundary. */
	retrievalMemberId: string | null
	mentionedMemberId: string | null
	reason: string | null
}

/**
 * Authorization runs BEFORE Ask retrieval.
 * Cross-member questions are blocked when viewing a specific member.
 */
export function resolveAskAuthorization(input: {
	question: string
	viewerMemberId: string | null
	viewerMemberName: string | null
	members: FamilyMemberWithAliases[]
	accountOwnerMemberId: string | null
}): AskAuthorizationResult {
	const mentionedMember = findMemberMentionedInText(
		input.members,
		input.question,
	)

	if (
		input.viewerMemberId &&
		mentionedMember &&
		mentionedMember.id !== input.viewerMemberId
	) {
		return {
			status: 'RESTRICTED',
			viewerMemberId: input.viewerMemberId,
			viewerMemberName: input.viewerMemberName,
			retrievalMemberId: null,
			mentionedMemberId: mentionedMember.id,
			reason: `This question is about ${mentionedMember.displayName}'s private records.`,
		}
	}

	const retrievalMemberId =
		input.viewerMemberId ?? (mentionedMember ? mentionedMember.id : null)

	return {
		status: 'ALLOWED',
		viewerMemberId: input.viewerMemberId,
		viewerMemberName: input.viewerMemberName,
		retrievalMemberId,
		mentionedMemberId: mentionedMember?.id ?? null,
		reason: null,
	}
}

export function buildRestrictedAccessMessage(
	memberName: string | null,
): string {
	if (memberName) {
		return `I can't share another family member's private information while you're viewing ${memberName}'s records. Switch to All Family or ask about ${memberName}'s own records instead.`
	}

	return "I can't share another family member's private information from this view."
}
