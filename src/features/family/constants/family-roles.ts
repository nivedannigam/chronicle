import type { FamilyRoleId } from '@/types/database/family-foundation.types'

export const FAMILY_ROLES: Array<{
	id: FamilyRoleId
	label: string
	description: string
}> = [
	{
		id: 'owner',
		label: 'Owner',
		description: 'Full control of the family account.',
	},
	{
		id: 'family_manager',
		label: 'Family Manager',
		description: 'Manage members and shared settings.',
	},
	{
		id: 'adult',
		label: 'Adult',
		description: 'Standard access to family modules.',
	},
	{
		id: 'child',
		label: 'Child',
		description: 'Limited access for younger members.',
	},
	{
		id: 'viewer',
		label: 'Viewer',
		description: 'Read-only access to shared data.',
	},
]

export const FAMILY_ROLE_LABELS: Record<FamilyRoleId, string> = {
	owner: 'Owner',
	family_manager: 'Family Manager',
	adult: 'Adult',
	child: 'Child',
	viewer: 'Viewer',
}

export const RELATIONSHIP_OPTIONS = [
	{ value: 'self', label: 'Self' },
	{ value: 'spouse', label: 'Spouse / Partner' },
	{ value: 'child', label: 'Child' },
	{ value: 'parent', label: 'Parent' },
	{ value: 'sibling', label: 'Sibling' },
	{ value: 'grandparent', label: 'Grandparent' },
	{ value: 'other', label: 'Other' },
] as const

export const GENDER_OPTIONS = [
	{ value: 'female', label: 'Female' },
	{ value: 'male', label: 'Male' },
	{ value: 'non_binary', label: 'Non-binary' },
	{ value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const

export const MEMBER_STATUS_OPTIONS = [
	{ value: 'active', label: 'Active' },
	{ value: 'inactive', label: 'Inactive' },
	{ value: 'archived', label: 'Archived' },
] as const

export const FUTURE_MODULE_PLACEHOLDERS = [
	{ id: 'health', label: 'Health', available: true },
	{ id: 'finance', label: 'Finance', available: false },
	{ id: 'documents', label: 'Documents', available: false },
	{ id: 'insurance', label: 'Insurance', available: false },
	{ id: 'travel', label: 'Travel', available: false },
] as const

export function canManageMembers(roleId: FamilyRoleId): boolean {
	return roleId === 'owner' || roleId === 'family_manager'
}

export function canManageInvitations(roleId: FamilyRoleId): boolean {
	return roleId === 'owner' || roleId === 'family_manager'
}
