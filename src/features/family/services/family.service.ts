import { supabase } from '@/lib/supabase'
import { QA_USER_ID } from '@/qa/qa-constants'
import { qaInterceptFamilyMembers } from '@/qa/qa-interceptors'
import { isQaModeEnabled } from '@/qa/qa-mode'
import { dedupeFamilyMembers } from '@/features/family/utils/dedupe-family-members'
import { getOrCreateFamily } from '@/features/family/services/family-platform.service'
import type {
	FamilyMember,
	FamilyMemberWithAliases,
} from '@/features/family/types/family.types'
import type {
	FamilyMemberStatus,
	FamilyRoleId,
} from '@/types/database/family-foundation.types'

const ensureDefaultPromises = new Map<
	string,
	Promise<FamilyMemberWithAliases[]>
>()

function mapFamilyMember(row: Record<string, unknown>): FamilyMember {
	return {
		id: row.id as string,
		userId: row.user_id as string,
		familyId: (row.family_id as string | null) ?? null,
		displayName: row.display_name as string,
		relationship: row.relationship as string,
		isAccountOwner: Boolean(row.is_account_owner),
		roleId: (row.role_id as FamilyRoleId) ?? 'adult',
		dateOfBirth: (row.date_of_birth as string | null) ?? null,
		gender: (row.gender as string | null) ?? null,
		status: (row.status as FamilyMemberStatus) ?? 'active',
		avatarUrl: (row.avatar_url as string | null) ?? null,
		sortOrder: Number(row.sort_order ?? 0),
		createdAt: row.created_at as string,
		updatedAt: row.updated_at as string,
	}
}

function mapFamilyMemberWithAliases(
	row: Record<string, unknown>,
): FamilyMemberWithAliases {
	const aliases =
		(row.family_member_aliases as Array<{ alias?: string }> | null)?.map(
			(entry) => entry.alias ?? '',
		) ?? []

	return {
		...mapFamilyMember(row),
		aliases: aliases.filter(Boolean),
	}
}

export async function listFamilyMembers(
	userId: string,
): Promise<FamilyMember[]> {
	const members = await listFamilyMembersWithAliases(userId)
	return members.map(({ aliases, ...member }) => {
		void aliases
		return member
	})
}

export async function listFamilyMembersWithAliases(
	userId: string,
): Promise<FamilyMemberWithAliases[]> {
	const qaMembers = qaInterceptFamilyMembers(userId)

	if (qaMembers) {
		return qaMembers
	}

	const { data, error } = await supabase
		.from('family_members')
		.select('*, family_member_aliases(alias)')
		.eq('user_id', userId)
		.order('sort_order', { ascending: true })
		.order('created_at', { ascending: true })

	if (error) {
		throw new Error(error.message)
	}

	return dedupeFamilyMembers(
		(data ?? []).map((row) =>
			mapFamilyMemberWithAliases(row as Record<string, unknown>),
		),
	)
}

export async function getFamilyMemberById(
	memberId: string,
): Promise<FamilyMemberWithAliases | null> {
	if (isQaModeEnabled()) {
		const qaMembers = qaInterceptFamilyMembers(QA_USER_ID)
		const qaMember = qaMembers?.find((member) => member.id === memberId) ?? null

		if (qaMember) {
			return qaMember
		}
	}

	const { data, error } = await supabase
		.from('family_members')
		.select('*, family_member_aliases(alias)')
		.eq('id', memberId)
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return data
		? mapFamilyMemberWithAliases(data as Record<string, unknown>)
		: null
}

export async function createFamilyMember(input: {
	userId: string
	familyId: string
	displayName: string
	relationship: string
	roleId?: FamilyRoleId
	dateOfBirth?: string | null
	gender?: string | null
	status?: FamilyMemberStatus
	aliases?: string[]
}) {
	const { data, error } = await supabase
		.from('family_members')
		.insert({
			user_id: input.userId,
			family_id: input.familyId,
			display_name: input.displayName.trim(),
			relationship: input.relationship,
			is_account_owner: input.relationship === 'self',
			role_id:
				input.roleId ?? (input.relationship === 'self' ? 'owner' : 'adult'),
			date_of_birth: input.dateOfBirth ?? null,
			gender: input.gender ?? null,
			status: input.status ?? 'active',
		})
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	const member = mapFamilyMember(data as Record<string, unknown>)

	if (input.aliases?.length) {
		await setFamilyMemberAliases(input.userId, member.id, input.aliases)
	}

	return member
}

export async function setFamilyMemberAliases(
	userId: string,
	familyMemberId: string,
	aliases: string[],
) {
	const normalized = [
		...new Set(aliases.map((alias) => alias.trim()).filter(Boolean)),
	]

	await supabase
		.from('family_member_aliases')
		.delete()
		.eq('user_id', userId)
		.eq('family_member_id', familyMemberId)

	if (normalized.length === 0) {
		return
	}

	const { error } = await supabase.from('family_member_aliases').insert(
		normalized.map((alias) => ({
			user_id: userId,
			family_member_id: familyMemberId,
			alias,
		})),
	)

	if (error) {
		throw new Error(error.message)
	}
}

export async function updateFamilyMember(
	memberId: string,
	updates: Partial<
		Pick<
			FamilyMember,
			| 'displayName'
			| 'relationship'
			| 'roleId'
			| 'dateOfBirth'
			| 'gender'
			| 'status'
			| 'avatarUrl'
		>
	>,
) {
	const { error } = await supabase
		.from('family_members')
		.update({
			display_name: updates.displayName,
			relationship: updates.relationship,
			role_id: updates.roleId,
			date_of_birth: updates.dateOfBirth,
			gender: updates.gender,
			status: updates.status,
			avatar_url: updates.avatarUrl,
			updated_at: new Date().toISOString(),
		})
		.eq('id', memberId)

	if (error) {
		throw new Error(error.message)
	}
}

export async function deleteFamilyMember(memberId: string) {
	const { error } = await supabase
		.from('family_members')
		.delete()
		.eq('id', memberId)

	if (error) {
		throw new Error(error.message)
	}
}

export async function ensureDefaultFamilyMember(input: {
	userId: string
	displayName: string
	profileName?: string
}) {
	const cached = ensureDefaultPromises.get(input.userId)

	if (cached) {
		return cached
	}

	const promise = ensureDefaultFamilyMemberInternal(input).finally(() => {
		ensureDefaultPromises.delete(input.userId)
	})

	ensureDefaultPromises.set(input.userId, promise)
	return promise
}

async function ensureDefaultFamilyMemberInternal(input: {
	userId: string
	displayName: string
	profileName?: string
}) {
	const family = await getOrCreateFamily(input.userId)
	const existing = await listFamilyMembersWithAliases(input.userId)

	if (existing.length > 0) {
		const needsFamilyLink = existing.some((member) => !member.familyId)

		if (needsFamilyLink) {
			await supabase
				.from('family_members')
				.update({ family_id: family.id })
				.eq('user_id', input.userId)
				.is('family_id', null)
		}

		return dedupeFamilyMembers(
			existing.map((member) =>
				member.familyId ? member : { ...member, familyId: family.id },
			),
		)
	}

	const member = await createFamilyMember({
		userId: input.userId,
		familyId: family.id,
		displayName: input.displayName,
		relationship: 'self',
		roleId: 'owner',
	})

	const aliases =
		input.profileName &&
		input.profileName.trim() &&
		input.profileName.trim().toLowerCase() !==
			input.displayName.trim().toLowerCase()
			? [input.profileName.trim()]
			: input.displayName.trim().toLowerCase() !== 'me'
				? [input.displayName.trim()]
				: []

	if (aliases.length > 0) {
		await setFamilyMemberAliases(input.userId, member.id, aliases)
	}

	return listFamilyMembersWithAliases(input.userId)
}
