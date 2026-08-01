import type { UploadedHealthReport } from '@/features/health/types'

export function getAccountOwnerMemberId(
	members: Array<{ id: string; isAccountOwner: boolean }>,
): string | null {
	return (
		members.find((member) => member.isAccountOwner)?.id ??
		members[0]?.id ??
		null
	)
}

export function filterReportsForMember(
	reports: UploadedHealthReport[],
	memberId: string | null | undefined,
	accountOwnerMemberId: string | null,
): UploadedHealthReport[] {
	if (!memberId) {
		return reports
	}

	return reports.filter((report) => {
		const reportMemberId = report.family_member_id ?? null

		if (!reportMemberId) {
			return memberId === accountOwnerMemberId
		}

		return reportMemberId === memberId
	})
}

export function getMemberInitials(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean)

	if (parts.length === 0) {
		return '?'
	}

	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase()
	}

	return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase()
}

export function formatDateOfBirth(value: string | null): string | null {
	if (!value) {
		return null
	}

	return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	})
}

export function getGreetingName(
	profileName: string | undefined,
	selectedMemberName: string | undefined,
): string {
	return profileName?.trim() || selectedMemberName?.trim() || 'there'
}

export function resolveMemberDisplayName(input: {
	profileName?: string | null
	memberDisplayName?: string | null
	isAccountOwner?: boolean
}): string {
	const profileFirst = input.profileName?.trim().split(/\s+/)[0]
	const memberName = input.memberDisplayName?.trim()

	if (
		input.isAccountOwner &&
		memberName?.toLowerCase() === 'me' &&
		profileFirst
	) {
		return profileFirst
	}

	return memberName || profileFirst || 'there'
}

export function getTimeOfDayGreeting(date = new Date()): string {
	const hour = date.getHours()

	if (hour < 12) {
		return 'Good morning'
	}

	if (hour < 17) {
		return 'Good afternoon'
	}

	return 'Good evening'
}
