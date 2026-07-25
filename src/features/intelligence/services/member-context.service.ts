import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { ConversationContext } from '@/features/personalization/types/personal-context.types'
import type { IntelligenceMemberContext } from '@/features/intelligence/types/intelligence.types'

function memberNames(member: FamilyMemberWithAliases): string[] {
	return [member.displayName, ...member.aliases]
		.map((name) => name.trim())
		.filter((name) => name.length > 2)
}

function findMemberByName(
	members: FamilyMemberWithAliases[],
	question: string,
): FamilyMemberWithAliases | undefined {
	const normalized = question.toLowerCase()

	return members.find((member) =>
		memberNames(member).some((name) => normalized.includes(name.toLowerCase())),
	)
}

function resolvePronounMember(input: {
	question: string
	selectedMemberId: string | null
	selectedMemberName: string | null
	members: FamilyMemberWithAliases[]
	conversationContext?: ConversationContext
}): FamilyMemberWithAliases | null {
	const normalized = input.question.trim().toLowerCase()

	if (!/\b(my|mine|me)\b/i.test(normalized)) {
		return null
	}

	if (input.conversationContext?.lastMemberId) {
		return (
			input.members.find(
				(member) => member.id === input.conversationContext!.lastMemberId,
			) ?? null
		)
	}

	if (input.selectedMemberId) {
		return (
			input.members.find((member) => member.id === input.selectedMemberId) ??
			null
		)
	}

	return null
}

export function resolveMemberFromQuestion(input: {
	question: string
	selectedMemberId: string | null
	selectedMemberName: string | null
	members: FamilyMemberWithAliases[]
	conversationContext?: ConversationContext
}): IntelligenceMemberContext {
	const explicitMatch = findMemberByName(input.members, input.question)

	if (explicitMatch) {
		return {
			memberId: explicitMatch.id,
			memberName: explicitMatch.displayName,
			familyMemberNames: input.members.map((member) => member.displayName),
		}
	}

	const pronounMember = resolvePronounMember(input)

	if (pronounMember) {
		return {
			memberId: pronounMember.id,
			memberName: pronounMember.displayName,
			familyMemberNames: input.members.map((member) => member.displayName),
		}
	}

	return {
		memberId: input.selectedMemberId,
		memberName: input.selectedMemberName,
		familyMemberNames: input.members.map((member) => member.displayName),
	}
}

export function buildMemorySessionKey(
	userId: string,
	memberId: string | null,
): string {
	return `${userId}:${memberId ?? 'default'}`
}
