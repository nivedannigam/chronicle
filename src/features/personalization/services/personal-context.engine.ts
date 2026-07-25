import { conversationMemory } from '@/features/ask/memory/conversation-memory'
import { resolveMemberFromQuestion } from '@/features/intelligence/services/member-context.service'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type {
	ChroniclePersonalPreferences,
	ConversationContext,
	PersonalContext,
} from '@/features/personalization/types/personal-context.types'
import {
	getFrequentTopicsForMember,
	getFrequentlyAccessedReportIds,
} from '@/features/personalization/services/usage-tracker.service'

export function buildConversationContext(
	sessionKey: string,
): ConversationContext {
	const turns = conversationMemory.getTurns(sessionKey)
	const latest = turns[turns.length - 1]

	if (!latest) {
		return { turnCount: 0 }
	}

	return {
		lastIntent: latest.intent,
		lastMetricName: latest.metricName,
		lastCategoryId: latest.categoryId,
		lastReportId: latest.reportId,
		lastTimeRangeYears: latest.timeRangeYears,
		lastMemberId: latest.memberId,
		lastMemberName: latest.memberName,
		lastQuestion: latest.question,
		turnCount: turns.length,
	}
}

export function buildPersonalContext(input: {
	userId: string
	question: string
	selectedMemberId: string | null
	selectedMemberName: string | null
	members: FamilyMemberWithAliases[]
	preferences: ChroniclePersonalPreferences
	sessionKey: string
}): PersonalContext {
	const activeMember = resolveMemberFromQuestion({
		question: input.question,
		selectedMemberId: input.selectedMemberId,
		selectedMemberName: input.selectedMemberName,
		members: input.members,
		conversationContext: buildConversationContext(input.sessionKey),
	})

	const isExplicitMemberQuery =
		Boolean(activeMember.memberId) &&
		activeMember.memberId !== input.selectedMemberId &&
		Boolean(
			input.members.some((member) => {
				const names = [member.displayName, ...member.aliases]
					.filter((name) => name.length > 2)
					.map((name) => name.toLowerCase())

				return (
					member.id === activeMember.memberId &&
					names.some((name) => input.question.toLowerCase().includes(name))
				)
			}),
		)

	const usageTopics = getFrequentTopicsForMember(
		input.userId,
		activeMember.memberId,
	)
	const usageReports = getFrequentlyAccessedReportIds(
		input.userId,
		activeMember.memberId,
	)

	return {
		userId: input.userId,
		activeMember,
		preferences: {
			...input.preferences,
			frequentTopics: [
				...new Set([...input.preferences.frequentTopics, ...usageTopics]),
			].slice(0, 12),
			frequentlyAccessedReportIds: [
				...new Set([
					...input.preferences.frequentlyAccessedReportIds,
					...usageReports,
				]),
			].slice(0, 20),
		},
		conversation: buildConversationContext(input.sessionKey),
		isExplicitMemberQuery,
	}
}

export function buildPersonalContextSessionKey(
	userId: string,
	memberId: string | null,
): string {
	return `${userId}:${memberId ?? 'default'}`
}

/** Ensures retrieval stays scoped to the active person unless explicitly overridden. */
export function assertMemberScopedUserId(
	personalContext: PersonalContext,
	requestedUserId: string,
): void {
	if (personalContext.userId !== requestedUserId) {
		throw new Error(
			'Personal context user mismatch — data isolation violation.',
		)
	}
}
