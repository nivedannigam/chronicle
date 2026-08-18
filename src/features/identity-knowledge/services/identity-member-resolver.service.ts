import { suggestFolderAssignment } from '@/features/family/services/folder-match.service'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'

export function resolveIdentityOwnerMemberId(input: {
	documentMemberId: string | null
	folderPath: string | null
	fileName: string
	members: FamilyMemberWithAliases[]
	accountOwnerMemberId: string | null
}): { memberId: string | null; memberName: string } {
	if (input.documentMemberId) {
		const member = input.members.find(
			(entry) => entry.id === input.documentMemberId,
		)

		if (member) {
			return { memberId: member.id, memberName: member.displayName }
		}
	}

	const pathSegments = (input.folderPath ?? input.fileName)
		.split(/[\\/]/)
		.map((segment) => segment.trim())
		.filter(Boolean)

	for (const segment of pathSegments) {
		const match = suggestFolderAssignment(segment, input.members)

		if (match) {
			const member = input.members.find((entry) => entry.id === match.memberId)

			if (member) {
				return {
					memberId: member.id,
					memberName: member.displayName,
				}
			}
		}
	}

	return { memberId: null, memberName: 'Owner not confirmed' }
}

export function isIdentityFolderPath(
	folderPath: string | null | undefined,
	rootPath: string | null | undefined,
): boolean {
	const path = (folderPath ?? '').trim().toLowerCase()
	const root = (rootPath ?? '').trim().toLowerCase()

	if (!path) {
		return false
	}

	if (!root) {
		return (
			/(^|[\\/])identity([\\/]|$)/i.test(path) ||
			/passport|aadhaar|pan/i.test(path)
		)
	}

	return (
		path === root || path.startsWith(`${root}/`) || path.startsWith(`${root}\\`)
	)
}
