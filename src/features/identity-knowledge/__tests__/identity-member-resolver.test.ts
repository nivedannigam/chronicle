import { describe, expect, it } from 'vitest'
import { resolveIdentityOwnerMemberId } from '@/features/identity-knowledge/services/identity-member-resolver.service'
import { resolveIdentityTypeId } from '@/features/identity-knowledge/services/identity-type.registry'

const members = [
	{
		id: 'member-nivedan',
		userId: 'user-1',
		familyId: null,
		displayName: 'Nivedan',
		relationship: 'self',
		isAccountOwner: true,
		roleId: 'adult',
		dateOfBirth: null,
		gender: null,
		status: 'active' as const,
		avatarUrl: null,
		sortOrder: 0,
		createdAt: '',
		updatedAt: '',
		aliases: [],
	},
	{
		id: 'member-advika',
		userId: 'user-1',
		familyId: null,
		displayName: 'Advika',
		relationship: 'child',
		isAccountOwner: false,
		roleId: 'child',
		dateOfBirth: null,
		gender: null,
		status: 'active' as const,
		avatarUrl: null,
		sortOrder: 1,
		createdAt: '',
		updatedAt: '',
		aliases: [],
	},
]

describe('resolveIdentityOwnerMemberId', () => {
	it('resolves owner from nested folder path', () => {
		const owner = resolveIdentityOwnerMemberId({
			documentMemberId: null,
			folderPath: 'Identity/Nivedan/Passport/passport.pdf',
			fileName: 'passport.pdf',
			members,
			accountOwnerMemberId: 'member-nivedan',
		})

		expect(owner.memberName).toBe('Nivedan')
		expect(owner.memberId).toBe('member-nivedan')
	})

	it('does not guess owner from account owner fallback', () => {
		const owner = resolveIdentityOwnerMemberId({
			documentMemberId: null,
			folderPath: 'Identity/Documents/misc.pdf',
			fileName: 'misc.pdf',
			members,
			accountOwnerMemberId: 'member-nivedan',
		})

		expect(owner.memberName).toBe('Owner not confirmed')
		expect(owner.memberId).toBeNull()
	})
})

describe('resolveIdentityTypeId', () => {
	it('recognizes common passport filename variants', () => {
		expect(
			resolveIdentityTypeId({
				subCategoryId: null,
				fileName: 'Passport_2026.pdf',
				folderPath: 'Identity/Nivedan/Passport',
			}),
		).toBe('passport')

		expect(
			resolveIdentityTypeId({
				subCategoryId: null,
				fileName: 'PP_Advika.pdf',
				folderPath: null,
			}),
		).toBe('passport')
	})
})
