import { supabase } from '@/lib/supabase'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import { listModuleFolderAssignments } from '@/features/settings/services/module-folder-assignments.service'
import type { ModuleFolderAssignment } from '@/features/settings/types/chronicle-module.types'
import { qaInterceptFolderAssignments } from '@/qa/qa-interceptors'
import { assertQaUserId } from '@/qa/qa-repository'

export interface VehicleSourceAssignment {
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
	discoveredVehicleNames: string[]
	assignedAt: string
	enabled: boolean
}

function mapAssignment(row: Record<string, unknown>): VehicleSourceAssignment {
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
		discoveredVehicleNames: Array.isArray(row.discovered_vehicle_names)
			? (row.discovered_vehicle_names as string[])
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

function mapModuleFolderAssignmentToVehicleSource(
	assignment: ModuleFolderAssignment,
): VehicleSourceAssignment {
	return {
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
		discoveredVehicleNames: ['XEV 9e', 'City Compact'],
		assignedAt: assignment.assignedAt,
		enabled: assignment.enabled,
	}
}

export async function listVehicleSourceAssignments(
	userId: string,
): Promise<VehicleSourceAssignment[]> {
	if (assertQaUserId(userId)) {
		const qaFolderAssignments = qaInterceptFolderAssignments(userId, 'vehicles')

		if (qaFolderAssignments !== null) {
			return qaFolderAssignments.map(mapModuleFolderAssignmentToVehicleSource)
		}
	}

	const { data, error } = await supabase
		.from('vehicle_folder_assignments')
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
		if (error.message.includes('vehicle_folder_assignments')) {
			const localAssignments = await listModuleFolderAssignments(
				userId,
				'vehicles',
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
				discoveredVehicleNames: [],
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

export async function assignVehicleSourceFolder(input: {
	userId: string
	externalFolderId: string
	folderName: string
	folderPath?: string | null
	familyMemberId: string
	discoveredVehicleNames?: string[]
	mode?: 'add' | 'replace'
}): Promise<VehicleSourceAssignment[]> {
	const folderId = await upsertConnectorFolder({
		userId: input.userId,
		externalFolderId: input.externalFolderId,
		folderName: input.folderName,
	})

	if (input.mode === 'replace') {
		const { error } = await supabase
			.from('vehicle_folder_assignments')
			.delete()
			.eq('user_id', input.userId)
			.eq('family_member_id', input.familyMemberId)

		if (error) {
			throw new Error(error.message)
		}
	}

	const { error: insertError } = await supabase
		.from('vehicle_folder_assignments')
		.upsert(
			{
				user_id: input.userId,
				connector_id: 'google-drive',
				folder_id: folderId,
				family_member_id: input.familyMemberId,
				folder_path: input.folderPath ?? input.folderName,
				discovered_vehicle_names: input.discoveredVehicleNames ?? [],
				assigned_at: new Date().toISOString(),
			},
			{ onConflict: 'folder_id,family_member_id' },
		)

	if (insertError) {
		throw new Error(insertError.message)
	}

	return listVehicleSourceAssignments(input.userId)
}

export async function removeVehicleSourceAssignment(
	userId: string,
	assignmentId: string,
): Promise<void> {
	const { error } = await supabase
		.from('vehicle_folder_assignments')
		.delete()
		.eq('user_id', userId)
		.eq('id', assignmentId)

	if (error) {
		throw new Error(error.message)
	}
}

export function toModuleFolderAssignments(
	assignments: VehicleSourceAssignment[],
): ModuleFolderAssignment[] {
	return assignments.map((assignment) => ({
		id: assignment.id,
		userId: assignment.userId,
		moduleId: 'vehicles',
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
