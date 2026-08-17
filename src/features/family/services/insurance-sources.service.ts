import { supabase } from '@/lib/supabase'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import {
	clearModuleFolderAssignments,
	listModuleFolderAssignments,
} from '@/features/settings/services/module-folder-assignments.service'
import type { ModuleFolderAssignment } from '@/features/settings/types/chronicle-module.types'

export interface InsuranceSourceAssignment {
	id: string
	userId: string
	connectorId: string
	folderId: string
	familyMemberId: string
	familyMemberName: string
	memberLabel: string
	externalFolderId: string
	folderName: string
	folderPath: string | null
	discoveredCategories: string[]
	assignedAt: string
	enabled: boolean
}

const legacyMigrationAttemptedForUser = new Set<string>()

function mapAssignment(
	row: Record<string, unknown>,
): InsuranceSourceAssignment {
	const folder = row.connector_folders as {
		id?: string
		external_folder_id?: string
		display_name?: string
		enabled?: boolean
	} | null
	const member = row.family_members as {
		display_name?: string
		relationship?: string
		is_account_owner?: boolean
		family_member_aliases?: Array<{ alias?: string }>
	} | null
	const aliases =
		member?.family_member_aliases
			?.map((entry) => entry.alias ?? '')
			.filter(Boolean) ?? []

	const memberWithAliases: FamilyMemberWithAliases = {
		id: row.family_member_id as string,
		userId: row.user_id as string,
		familyId: null,
		displayName: member?.display_name ?? 'Unknown',
		relationship: member?.relationship ?? 'other',
		isAccountOwner: Boolean(member?.is_account_owner),
		roleId: 'adult',
		dateOfBirth: null,
		gender: null,
		status: 'active',
		avatarUrl: null,
		sortOrder: 0,
		createdAt: '',
		updatedAt: '',
		aliases,
	}

	return {
		id: row.id as string,
		userId: row.user_id as string,
		connectorId: 'google-drive',
		folderId: folder?.id ?? (row.folder_id as string),
		familyMemberId: row.family_member_id as string,
		familyMemberName: member?.display_name ?? 'Unknown',
		memberLabel: formatMemberLabel(memberWithAliases),
		externalFolderId: folder?.external_folder_id ?? '',
		folderName: folder?.display_name ?? 'Unknown folder',
		folderPath: (row.folder_path as string | null) ?? null,
		discoveredCategories: Array.isArray(row.discovered_categories)
			? (row.discovered_categories as string[])
			: [],
		assignedAt: row.assigned_at as string,
		enabled: Boolean(folder?.enabled ?? true),
	}
}

async function upsertConnectorFolder(input: {
	userId: string
	externalFolderId: string
	folderName: string
}) {
	const { data, error } = await supabase
		.from('connector_folders')
		.upsert(
			{
				user_id: input.userId,
				connector_id: 'google-drive',
				external_folder_id: input.externalFolderId,
				display_name: input.folderName,
				alias: input.folderName,
				enabled: true,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: 'user_id,connector_id,external_folder_id' },
		)
		.select('id')
		.single()

	if (error) {
		throw new Error(error.message)
	}

	return data.id as string
}

async function persistInsuranceSourceFolder(input: {
	userId: string
	externalFolderId: string
	folderName: string
	folderPath?: string | null
	familyMemberId: string
	discoveredCategories?: string[]
	mode?: 'add' | 'replace'
}): Promise<void> {
	const folderId = await upsertConnectorFolder({
		userId: input.userId,
		externalFolderId: input.externalFolderId,
		folderName: input.folderName,
	})

	if (input.mode === 'replace') {
		const { error } = await supabase
			.from('insurance_folder_assignments')
			.delete()
			.eq('user_id', input.userId)
			.eq('family_member_id', input.familyMemberId)

		if (error) {
			throw new Error(error.message)
		}
	}

	const { error: insertError } = await supabase
		.from('insurance_folder_assignments')
		.upsert(
			{
				user_id: input.userId,
				connector_id: 'google-drive',
				folder_id: folderId,
				family_member_id: input.familyMemberId,
				folder_path: input.folderPath ?? input.folderName,
				discovered_categories: input.discoveredCategories ?? [],
				assigned_at: new Date().toISOString(),
			},
			{ onConflict: 'folder_id,family_member_id' },
		)

	if (insertError) {
		throw new Error(insertError.message)
	}
}

async function migrateLocalStorageAssignments(userId: string): Promise<void> {
	if (legacyMigrationAttemptedForUser.has(userId)) {
		return
	}

	legacyMigrationAttemptedForUser.add(userId)

	const localAssignments = await listModuleFolderAssignments(
		userId,
		'insurance',
	)

	if (localAssignments.length === 0) {
		return
	}

	for (const assignment of localAssignments) {
		try {
			await persistInsuranceSourceFolder({
				userId,
				externalFolderId: assignment.externalFolderId,
				folderName: assignment.folderName,
				folderPath: assignment.folderPath,
				familyMemberId: assignment.familyMemberId,
				discoveredCategories: [],
				mode: 'add',
			})
		} catch {
			// Best-effort migration from legacy localStorage assignments.
		}
	}

	await clearModuleFolderAssignments(userId, 'insurance')
}

export async function listInsuranceSourceAssignments(
	userId: string,
	options?: { skipMigration?: boolean },
): Promise<InsuranceSourceAssignment[]> {
	if (!options?.skipMigration) {
		await migrateLocalStorageAssignments(userId)
	}

	const { data, error } = await supabase
		.from('insurance_folder_assignments')
		.select(
			`
			*,
			connector_folders(id, external_folder_id, display_name, enabled),
			family_members(display_name, relationship, is_account_owner, family_member_aliases(alias))
		`,
		)
		.eq('user_id', userId)
		.eq('connector_id', 'google-drive')
		.order('assigned_at', { ascending: false })

	if (error) {
		if (error.message.includes('insurance_folder_assignments')) {
			const localAssignments = await listModuleFolderAssignments(
				userId,
				'insurance',
			)

			return localAssignments.map((assignment) => ({
				id: assignment.id,
				userId: assignment.userId,
				connectorId: assignment.connectorId,
				folderId: assignment.folderId,
				familyMemberId: assignment.familyMemberId,
				familyMemberName: assignment.familyMemberName,
				memberLabel: assignment.memberLabel,
				externalFolderId: assignment.externalFolderId,
				folderName: assignment.folderName,
				folderPath: assignment.folderPath,
				discoveredCategories: [],
				assignedAt: assignment.assignedAt,
				enabled: assignment.enabled,
			}))
		}

		throw new Error(error.message)
	}

	return (data ?? []).map((row) =>
		mapAssignment(row as Record<string, unknown>),
	)
}

export async function assignInsuranceSourceFolder(input: {
	userId: string
	externalFolderId: string
	folderName: string
	folderPath?: string | null
	familyMemberId: string
	discoveredCategories?: string[]
	mode?: 'add' | 'replace'
}): Promise<InsuranceSourceAssignment[]> {
	await persistInsuranceSourceFolder(input)

	return listInsuranceSourceAssignments(input.userId, { skipMigration: true })
}

export async function removeInsuranceSourceAssignment(
	userId: string,
	assignmentId: string,
): Promise<void> {
	const { error } = await supabase
		.from('insurance_folder_assignments')
		.delete()
		.eq('user_id', userId)
		.eq('id', assignmentId)

	if (error) {
		throw new Error(error.message)
	}
}

export function toModuleFolderAssignments(
	assignments: InsuranceSourceAssignment[],
): ModuleFolderAssignment[] {
	return assignments.map((assignment) => ({
		id: assignment.id,
		userId: assignment.userId,
		moduleId: 'insurance',
		connectorId: assignment.connectorId,
		folderId: assignment.folderId,
		familyMemberId: assignment.familyMemberId,
		familyMemberName: assignment.familyMemberName,
		memberLabel: assignment.memberLabel,
		externalFolderId: assignment.externalFolderId,
		folderName: assignment.folderName,
		folderPath: assignment.folderPath,
		assignedAt: assignment.assignedAt,
		enabled: assignment.enabled,
	}))
}

/** @internal Test helper to reset in-memory migration guard. */
export function resetInsuranceLegacyMigrationForTests(): void {
	legacyMigrationAttemptedForUser.clear()
}
