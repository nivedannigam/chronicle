import { supabase } from '@/lib/supabase'
import { dedupeFamilyMembers } from '@/features/family/utils/dedupe-family-members'
import type {
	FamilyMember,
	FamilyMemberWithAliases,
} from '@/features/family/types/family.types'

const ensureDefaultPromises = new Map<
	string,
	Promise<FamilyMemberWithAliases[]>
>()

function mapFamilyMember(row: Record<string, unknown>): FamilyMember {
	return {
		id: row.id as string,
		userId: row.user_id as string,
		displayName: row.display_name as string,
		relationship: row.relationship as string,
		isAccountOwner: Boolean(row.is_account_owner),
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

export async function createFamilyMember(input: {
	userId: string
	displayName: string
	relationship: string
	aliases?: string[]
}) {
	const { data, error } = await supabase
		.from('family_members')
		.insert({
			user_id: input.userId,
			display_name: input.displayName.trim(),
			relationship: input.relationship,
			is_account_owner: input.relationship === 'self',
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
	updates: Partial<Pick<FamilyMember, 'displayName' | 'relationship'>>,
) {
	const { error } = await supabase
		.from('family_members')
		.update({
			display_name: updates.displayName,
			relationship: updates.relationship,
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
	const existing = await listFamilyMembersWithAliases(input.userId)

	if (existing.length > 0) {
		return dedupeFamilyMembers(existing)
	}

	const member = await createFamilyMember({
		userId: input.userId,
		displayName: input.displayName,
		relationship: 'self',
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
