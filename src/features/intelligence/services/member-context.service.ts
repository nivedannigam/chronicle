import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { IntelligenceMemberContext } from '@/features/intelligence/types/intelligence.types'

export function resolveMemberFromQuestion(input: {
	question: string
	selectedMemberId: string | null
	selectedMemberName: string | null
	members: FamilyMemberWithAliases[]
}): IntelligenceMemberContext {
	const normalized = input.question.toLowerCase()
	const matchedMember = input.members.find((member) => {
		const name = member.displayName.toLowerCase()
		return name.length > 2 && normalized.includes(name)
	})

	if (matchedMember) {
		return {
			memberId: matchedMember.id,
			memberName: matchedMember.displayName,
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
