import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'

export function dedupeFamilyMembers(
	members: FamilyMemberWithAliases[],
): FamilyMemberWithAliases[] {
	const seen = new Map<string, FamilyMemberWithAliases>()

	for (const member of members) {
		if (!seen.has(member.id)) {
			seen.set(member.id, member)
		}
	}

	return [...seen.values()]
}

function normalizeLabel(label: string): string {
	return label
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '')
}

export function dedupeFamilyMembersByLabel(
	members: FamilyMemberWithAliases[],
	configuredMemberIds: Set<string> = new Set(),
): FamilyMemberWithAliases[] {
	const byLabel = new Map<string, FamilyMemberWithAliases>()

	for (const member of dedupeFamilyMembers(members)) {
		const label = normalizeLabel(formatMemberLabel(member))
		const existing = byLabel.get(label)

		if (!existing) {
			byLabel.set(label, member)
			continue
		}

		const existingConfigured = configuredMemberIds.has(existing.id)
		const memberConfigured = configuredMemberIds.has(member.id)

		if (memberConfigured && !existingConfigured) {
			byLabel.set(label, member)
		}
	}

	return [...byLabel.values()]
}
