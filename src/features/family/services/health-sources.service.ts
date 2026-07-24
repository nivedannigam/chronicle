import { supabase } from '@/lib/supabase'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { listFamilyMembersWithAliases } from '@/features/family/services/family.service'
import { dedupeFamilyMembers } from '@/features/family/utils/dedupe-family-members'
import { mapScanError } from '@/features/family/utils/assignment-errors'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import { runMedicalDiscovery } from '@/features/medical-discovery/services/medical-discovery-engine.service'
import type {
	DiscoveredMedicalFile,
	HealthSourceAssignment,
	HealthSourceMemberGroup,
	MedicalReportScanResult,
} from '@/features/family/types/family.types'

function mapAssignment(row: Record<string, unknown>): HealthSourceAssignment {
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
		family_id?: string | null
		role_id?: string
		date_of_birth?: string | null
		gender?: string | null
		status?: string
		avatar_url?: string | null
		family_member_aliases?: Array<{ alias?: string }>
	} | null
	const aliases =
		member?.family_member_aliases
			?.map((entry) => entry.alias ?? '')
			.filter(Boolean) ?? []

	const memberWithAliases: FamilyMemberWithAliases = {
		id: row.family_member_id as string,
		userId: row.user_id as string,
		familyId: member?.family_id ?? null,
		displayName: member?.display_name ?? 'Unknown',
		relationship: member?.relationship ?? 'other',
		isAccountOwner: Boolean(member?.is_account_owner),
		roleId: (member?.role_id as FamilyMemberWithAliases['roleId']) ?? 'adult',
		dateOfBirth: member?.date_of_birth ?? null,
		gender: member?.gender ?? null,
		status: (member?.status as FamilyMemberWithAliases['status']) ?? 'active',
		avatarUrl: member?.avatar_url ?? null,
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
		assignedAt: row.assigned_at as string,
		enabled: Boolean(folder?.enabled ?? true),
	}
}

export async function listHealthSourceAssignments(
	userId: string,
): Promise<HealthSourceAssignment[]> {
	const { data, error } = await supabase
		.from('health_folder_assignments')
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
		throw new Error(error.message)
	}

	return (data ?? []).map((row) =>
		mapAssignment(row as Record<string, unknown>),
	)
}

/** @deprecated Use listHealthSourceAssignments */
export const listHealthSourceMappings = listHealthSourceAssignments

export async function listHealthSourcesGroupedByMember(
	userId: string,
): Promise<HealthSourceMemberGroup[]> {
	const [members, assignments] = await Promise.all([
		listFamilyMembersWithAliases(userId),
		listHealthSourceAssignments(userId),
	])

	return members.map((member) => ({
		member,
		memberLabel: formatMemberLabel(member),
		assignments: assignments.filter(
			(assignment) => assignment.familyMemberId === member.id,
		),
	}))
}

export async function getAssignmentsForFolder(
	userId: string,
	externalFolderId: string,
): Promise<HealthSourceAssignment[]> {
	const assignments = await listHealthSourceAssignments(userId)
	return assignments.filter(
		(assignment) => assignment.externalFolderId === externalFolderId,
	)
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

export async function assignHealthSourceFolders(input: {
	userId: string
	externalFolderId: string
	folderName: string
	familyMemberIds: string[]
	mode?: 'add' | 'replace'
}) {
	const members = dedupeFamilyMembers(
		await listFamilyMembersWithAliases(input.userId),
	)
	const validMemberIds = new Set(members.map((member) => member.id))
	const targetMemberIds = input.familyMemberIds.filter((memberId) =>
		validMemberIds.has(memberId),
	)

	if (targetMemberIds.length === 0) {
		throw new Error('Select at least one family member.')
	}

	if (input.mode === 'replace') {
		for (const memberId of targetMemberIds) {
			await removeMemberAssignmentsExcept(
				input.userId,
				memberId,
				input.externalFolderId,
			)
		}
	}

	const folderId = await upsertConnectorFolder({
		userId: input.userId,
		externalFolderId: input.externalFolderId,
		folderName: input.folderName,
	})

	const { data: existingRows, error: existingError } = await supabase
		.from('health_folder_assignments')
		.select('id, family_member_id')
		.eq('folder_id', folderId)

	if (existingError) {
		throw new Error(existingError.message)
	}

	const existingMemberIds = new Set(
		(existingRows ?? []).map((row) => row.family_member_id as string),
	)
	const targetSet = new Set(targetMemberIds)

	for (const row of existingRows ?? []) {
		if (!targetSet.has(row.family_member_id as string)) {
			const { error } = await supabase
				.from('health_folder_assignments')
				.delete()
				.eq('id', row.id as string)

			if (error) {
				throw new Error(error.message)
			}
		}
	}

	for (const memberId of targetMemberIds) {
		if (existingMemberIds.has(memberId)) {
			const { error } = await supabase
				.from('health_folder_assignments')
				.update({ assigned_at: new Date().toISOString() })
				.eq('folder_id', folderId)
				.eq('family_member_id', memberId)

			if (error) {
				throw new Error(error.message)
			}

			continue
		}

		const { error } = await supabase.from('health_folder_assignments').insert({
			user_id: input.userId,
			connector_id: 'google-drive',
			folder_id: folderId,
			family_member_id: memberId,
			assigned_at: new Date().toISOString(),
		})

		if (error) {
			throw new Error(error.message)
		}
	}

	return listHealthSourceAssignments(input.userId)
}

/** @deprecated Use assignHealthSourceFolders */
export async function assignHealthSourceFolder(input: {
	userId: string
	familyMemberId: string
	externalFolderId: string
	folderName: string
}) {
	await assignHealthSourceFolders({
		userId: input.userId,
		externalFolderId: input.externalFolderId,
		folderName: input.folderName,
		familyMemberIds: [input.familyMemberId],
	})

	const assignments = await listHealthSourceAssignments(input.userId)
	return (
		assignments.find(
			(assignment) =>
				assignment.externalFolderId === input.externalFolderId &&
				assignment.familyMemberId === input.familyMemberId,
		) ?? assignments[0]
	)
}

export async function removeHealthSourceAssignment(assignmentId: string) {
	const { error } = await supabase
		.from('health_folder_assignments')
		.delete()
		.eq('id', assignmentId)

	if (error) {
		throw new Error(error.message)
	}
}

export { removeHealthSourceAndData } from '@/features/health-import/services/health-data-cleanup.service'

/** @deprecated Use removeHealthSourceAssignment */
export const removeHealthSourceMapping = removeHealthSourceAssignment

export async function removeMemberAssignmentsExcept(
	userId: string,
	familyMemberId: string,
	keepExternalFolderId: string,
) {
	const assignments = await listHealthSourceAssignments(userId)
	const toRemove = assignments.filter(
		(assignment) =>
			assignment.familyMemberId === familyMemberId &&
			assignment.externalFolderId !== keepExternalFolderId,
	)

	for (const assignment of toRemove) {
		await removeHealthSourceAssignment(assignment.id)
	}
}

export async function getMemberExistingFolders(
	userId: string,
	familyMemberId: string,
	excludeExternalFolderId?: string,
) {
	const assignments = await listHealthSourceAssignments(userId)
	return assignments.filter(
		(assignment) =>
			assignment.familyMemberId === familyMemberId &&
			assignment.externalFolderId !== excludeExternalFolderId,
	)
}

export async function scanMedicalReportsForFolders(
	userId: string,
	folderIds: string[],
): Promise<MedicalReportScanResult> {
	if (folderIds.length === 0) {
		return {
			success: false,
			totalFiles: 0,
			byMember: [],
			discoveredFiles: [],
			unconfiguredMembers: [],
			error: 'No folders selected to scan.',
		}
	}

	try {
		const [members, assignments] = await Promise.all([
			listFamilyMembersWithAliases(userId),
			listHealthSourceAssignments(userId),
		])

		const { files } = await runMedicalDiscovery({
			userId,
			mode: 'manual',
			folderIds,
		})

		const discoveredFiles: DiscoveredMedicalFile[] = files
			.filter((file) => file.category !== 'ignored')
			.map((file) => {
				const folderAssignments = assignments.filter(
					(assignment) => assignment.externalFolderId === file.folderExternalId,
				)

				return {
					externalFileId: file.fileId,
					fileName: file.name,
					mimeType: file.mimeType,
					folderName: folderAssignments[0]?.folderName ?? file.folderPath,
					folderExternalId: file.folderExternalId,
					assignedMemberNames: folderAssignments.map(
						(assignment) => assignment.memberLabel,
					),
				}
			})

		const scannedFolderIds = new Set(folderIds)
		const byMember = dedupeFamilyMembers(members)
			.filter((member) =>
				assignments.some(
					(assignment) =>
						assignment.familyMemberId === member.id &&
						scannedFolderIds.has(assignment.externalFolderId),
				),
			)
			.map((member) => {
				const memberAssignments = assignments.filter(
					(assignment) =>
						assignment.familyMemberId === member.id &&
						scannedFolderIds.has(assignment.externalFolderId),
				)
				const folderExternalIds = new Set(
					memberAssignments.map((assignment) => assignment.externalFolderId),
				)

				return {
					familyMemberId: member.id,
					familyMemberName: formatMemberLabel(member),
					folderNames: memberAssignments.map(
						(assignment) => assignment.folderName,
					),
					fileCount: files.filter(
						(file) =>
							file.category !== 'ignored' &&
							folderExternalIds.has(file.folderExternalId),
					).length,
				}
			})

		return {
			success: true,
			totalFiles: discoveredFiles.length,
			byMember,
			discoveredFiles,
			unconfiguredMembers: [],
		}
	} catch (error) {
		return {
			success: false,
			totalFiles: 0,
			byMember: [],
			discoveredFiles: [],
			unconfiguredMembers: [],
			error: mapScanError(error),
		}
	}
}

export async function scanMedicalReports(
	userId: string,
): Promise<MedicalReportScanResult> {
	const [members, assignments] = await Promise.all([
		listFamilyMembersWithAliases(userId),
		listHealthSourceAssignments(userId),
	])

	const configuredMemberIds = new Set(
		assignments.map((assignment) => assignment.familyMemberId),
	)
	const unconfiguredMembers = members.filter(
		(member) => !configuredMemberIds.has(member.id),
	)

	const uniqueFolderIds = [
		...new Set(assignments.map((assignment) => assignment.externalFolderId)),
	]

	if (uniqueFolderIds.length === 0) {
		return {
			success: false,
			totalFiles: 0,
			byMember: [],
			discoveredFiles: [],
			unconfiguredMembers,
			error: 'No health folders configured yet.',
		}
	}

	return scanMedicalReportsForFolders(userId, uniqueFolderIds)
}
