import type {
	FamilyMemberWithAliases,
	FolderMatchSuggestion,
} from '@/features/family/types/family.types'
import { dedupeFamilyMembers } from '@/features/family/utils/dedupe-family-members'

function normalizeName(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '')
}

function levenshteinDistance(a: string, b: string): number {
	const matrix = Array.from({ length: a.length + 1 }, () =>
		Array.from({ length: b.length + 1 }, () => 0),
	)

	for (let row = 0; row <= a.length; row += 1) {
		matrix[row][0] = row
	}

	for (let col = 0; col <= b.length; col += 1) {
		matrix[0][col] = col
	}

	for (let row = 1; row <= a.length; row += 1) {
		for (let col = 1; col <= b.length; col += 1) {
			const cost = a[row - 1] === b[col - 1] ? 0 : 1
			matrix[row][col] = Math.min(
				matrix[row - 1][col] + 1,
				matrix[row][col - 1] + 1,
				matrix[row - 1][col - 1] + cost,
			)
		}
	}

	return matrix[a.length][b.length]
}

function scoreNameMatch(folderName: string, candidate: string): number {
	const folder = normalizeName(folderName)
	const target = normalizeName(candidate)

	if (!folder || !target) {
		return 0
	}

	if (folder === target) {
		return 99
	}

	if (folder.includes(target) || target.includes(folder)) {
		return 94
	}

	const distance = levenshteinDistance(folder, target)
	const ratio = 1 - distance / Math.max(folder.length, target.length)

	if (ratio >= 0.88) {
		return Math.round(ratio * 100)
	}

	return Math.round(ratio * 70)
}

export function formatMemberLabel(member: FamilyMemberWithAliases): string {
	if (
		(member.relationship === 'self' || member.isAccountOwner) &&
		member.displayName.toLowerCase() === 'me' &&
		member.aliases.length > 0
	) {
		return `Me (${member.aliases[0]})`
	}

	return member.displayName
}

function normalizeAlias(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '')
}

export function getNonRedundantAliases(
	member: FamilyMemberWithAliases,
	label: string,
): string[] {
	const labelNorm = normalizeAlias(label)

	return member.aliases.filter((alias) => {
		const aliasNorm = normalizeAlias(alias)
		return aliasNorm !== labelNorm && !labelNorm.includes(aliasNorm)
	})
}

function buildMatchReasons(input: {
	folderName: string
	member: FamilyMemberWithAliases
	matchedDisplayName: boolean
	matchedAlias: string | null
}): string[] {
	const reasons: string[] = []

	if (input.matchedDisplayName) {
		reasons.push('Folder name matches family member')
	}

	if (input.matchedAlias) {
		reasons.push('Alias matched')
	}

	if (reasons.length === 0) {
		reasons.push('Folder name closely matches family member')
	}

	return reasons
}

export function suggestFolderAssignment(
	folderName: string,
	members: FamilyMemberWithAliases[],
): FolderMatchSuggestion | null {
	const uniqueMembers = dedupeFamilyMembers(members)
	let best: FolderMatchSuggestion | null = null

	for (const member of uniqueMembers) {
		const displayScore = scoreNameMatch(folderName, member.displayName)
		const relationshipScore = scoreNameMatch(folderName, member.relationship)

		if (displayScore > (best?.confidence ?? 0)) {
			best = {
				memberId: member.id,
				memberLabel: formatMemberLabel(member),
				confidence: displayScore,
				reasons: buildMatchReasons({
					folderName,
					member,
					matchedDisplayName: displayScore >= 90,
					matchedAlias: null,
				}),
			}
		}

		for (const alias of member.aliases) {
			const aliasScore = scoreNameMatch(folderName, alias)

			if (aliasScore > (best?.confidence ?? 0)) {
				best = {
					memberId: member.id,
					memberLabel: formatMemberLabel(member),
					confidence: aliasScore,
					reasons: buildMatchReasons({
						folderName,
						member,
						matchedDisplayName: false,
						matchedAlias: alias,
					}),
				}
			}
		}

		if (relationshipScore > (best?.confidence ?? 0)) {
			best = {
				memberId: member.id,
				memberLabel: formatMemberLabel(member),
				confidence: relationshipScore,
				reasons: ['Folder name matches relationship'],
			}
		}
	}

	if (!best || best.confidence < 90) {
		return null
	}

	return best
}

export function getAssignmentsLabel(memberNames: string[]): string {
	if (memberNames.length === 0) {
		return ''
	}

	if (memberNames.length === 1) {
		return `Assigned to ${memberNames[0]}`
	}

	if (memberNames.length === 2) {
		return `Assigned to ${memberNames[0]} and ${memberNames[1]}`
	}

	return `Assigned to ${memberNames.slice(0, -1).join(', ')}, and ${memberNames[memberNames.length - 1]}`
}

export function getShortAssignmentLabel(memberNames: string[]): string {
	if (memberNames.length === 0) {
		return ''
	}

	if (memberNames.length === 1) {
		return memberNames[0]
	}

	return `${memberNames.length} members`
}
