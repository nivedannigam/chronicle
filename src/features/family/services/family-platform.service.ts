import { supabase } from '@/lib/supabase'
import { qaInterceptFamily } from '@/qa/qa-interceptors'
import { qaShouldBypassRemoteTables } from '@/qa/qa-boundary'
import type {
	Family,
	FamilyInvitation,
	FamilyRole,
	MemberPreferences,
} from '@/features/family/types/family.types'
import type {
	FamilyInvitationRow,
	FamilyRoleRow,
	FamilyRow,
	MemberPreferencesRow,
} from '@/types/database/family-foundation.types'

function mapFamily(row: FamilyRow): Family {
	return {
		id: row.id,
		name: row.name,
		ownerUserId: row.owner_user_id,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

function mapFamilyRole(row: FamilyRoleRow): FamilyRole {
	return {
		id: row.id as FamilyRole['id'],
		label: row.label,
		description: row.description,
		sortOrder: row.sort_order,
		permissions: row.permissions ?? {},
	}
}

function mapInvitation(row: FamilyInvitationRow): FamilyInvitation {
	return {
		id: row.id,
		familyId: row.family_id,
		email: row.email,
		roleId: row.role_id as FamilyInvitation['roleId'],
		invitedByUserId: row.invited_by_user_id,
		status: row.status,
		expiresAt: row.expires_at,
		createdAt: row.created_at,
	}
}

function mapPreferences(row: MemberPreferencesRow): MemberPreferences {
	return {
		id: row.id,
		userId: row.user_id,
		familyId: row.family_id,
		selectedMemberId: row.selected_member_id,
		preferences: row.preferences ?? {},
		updatedAt: row.updated_at,
	}
}

export async function listFamilyRoles(): Promise<FamilyRole[]> {
	const { data, error } = await supabase
		.from('family_roles')
		.select('*')
		.order('sort_order', { ascending: true })

	if (error) {
		throw new Error(error.message)
	}

	return (data ?? []).map((row) => mapFamilyRole(row as FamilyRoleRow))
}

export async function getOrCreateFamily(userId: string): Promise<Family> {
	const qaFamily = qaInterceptFamily(userId)

	if (qaFamily) {
		return qaFamily
	}

	const { data: existing, error: fetchError } = await supabase
		.from('families')
		.select('*')
		.eq('owner_user_id', userId)
		.maybeSingle()

	if (fetchError) {
		throw new Error(fetchError.message)
	}

	if (existing) {
		return mapFamily(existing as FamilyRow)
	}

	const { data, error } = await supabase
		.from('families')
		.insert({
			owner_user_id: userId,
			name: 'My Family',
		})
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return mapFamily(data as FamilyRow)
}

export async function updateFamilyName(familyId: string, name: string) {
	const { error } = await supabase
		.from('families')
		.update({
			name: name.trim(),
			updated_at: new Date().toISOString(),
		})
		.eq('id', familyId)

	if (error) {
		throw new Error(error.message)
	}
}

export async function getMemberPreferences(
	userId: string,
	familyId: string,
): Promise<MemberPreferences | null> {
	if (qaShouldBypassRemoteTables(userId)) {
		return null
	}

	const { data, error } = await supabase
		.from('member_preferences')
		.select('*')
		.eq('user_id', userId)
		.eq('family_id', familyId)
		.maybeSingle()

	if (error) {
		throw new Error(error.message)
	}

	return data ? mapPreferences(data as MemberPreferencesRow) : null
}

export async function saveSelectedMemberPreference(input: {
	userId: string
	familyId: string
	selectedMemberId: string | null
}) {
	const { error } = await supabase.from('member_preferences').upsert(
		{
			user_id: input.userId,
			family_id: input.familyId,
			selected_member_id: input.selectedMemberId,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: 'user_id,family_id' },
	)

	if (error) {
		throw new Error(error.message)
	}
}

export async function savePersonalPreferences(input: {
	userId: string
	familyId: string
	preferences: Record<string, unknown>
}) {
	const existing = await getMemberPreferences(input.userId, input.familyId)

	const { error } = await supabase.from('member_preferences').upsert(
		{
			user_id: input.userId,
			family_id: input.familyId,
			selected_member_id: existing?.selectedMemberId ?? null,
			preferences: input.preferences,
			updated_at: new Date().toISOString(),
		},
		{ onConflict: 'user_id,family_id' },
	)

	if (error) {
		throw new Error(error.message)
	}
}

export async function listFamilyInvitations(
	familyId: string,
): Promise<FamilyInvitation[]> {
	const { data, error } = await supabase
		.from('family_invitations')
		.select('*')
		.eq('family_id', familyId)
		.order('created_at', { ascending: false })

	if (error) {
		throw new Error(error.message)
	}

	return (data ?? []).map((row) => mapInvitation(row as FamilyInvitationRow))
}

/** Architecture-only stub — email delivery is not implemented. */
export async function createFamilyInvitationDraft(input: {
	familyId: string
	email: string
	roleId: string
	invitedByUserId: string
}) {
	const { data, error } = await supabase
		.from('family_invitations')
		.insert({
			family_id: input.familyId,
			email: input.email.trim().toLowerCase(),
			role_id: input.roleId,
			invited_by_user_id: input.invitedByUserId,
			status: 'pending',
			expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
		})
		.select('*')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return mapInvitation(data as FamilyInvitationRow)
}

export async function revokeFamilyInvitation(invitationId: string) {
	const { error } = await supabase
		.from('family_invitations')
		.update({
			status: 'revoked',
			updated_at: new Date().toISOString(),
		})
		.eq('id', invitationId)

	if (error) {
		throw new Error(error.message)
	}
}
