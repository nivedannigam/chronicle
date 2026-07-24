/** Database row shapes for Foundation 1 family tables */

export interface FamilyRow {
	id: string
	name: string
	owner_user_id: string
	created_at: string
	updated_at: string
}

export interface FamilyRoleRow {
	id: string
	label: string
	description: string | null
	sort_order: number
	permissions: Record<string, boolean>
	created_at: string
}

export interface FamilyMemberRow {
	id: string
	user_id: string
	family_id: string | null
	display_name: string
	relationship: string
	is_account_owner: boolean
	sort_order: number
	role_id: string
	date_of_birth: string | null
	gender: string | null
	status: string
	avatar_url: string | null
	created_at: string
	updated_at: string
}

export interface FamilyInvitationRow {
	id: string
	family_id: string
	email: string
	role_id: string
	invited_by_user_id: string
	status: 'pending' | 'accepted' | 'expired' | 'revoked'
	token_hash: string | null
	expires_at: string | null
	created_at: string
	updated_at: string
}

export interface MemberPreferencesRow {
	id: string
	user_id: string
	family_id: string
	selected_member_id: string | null
	preferences: Record<string, unknown>
	updated_at: string
}

export type FamilyRoleId =
	'owner' | 'family_manager' | 'adult' | 'child' | 'viewer'

export type FamilyMemberStatus = 'active' | 'inactive' | 'archived'

export type FamilyInvitationStatus =
	'pending' | 'accepted' | 'expired' | 'revoked'
