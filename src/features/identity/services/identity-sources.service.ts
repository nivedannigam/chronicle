import {
	assignModuleFolder,
	listModuleFolderAssignments,
	removeModuleFolderAssignment,
} from '@/features/settings/services/module-folder-assignments.service'
import type { ModuleFolderAssignment } from '@/features/settings/types/chronicle-module.types'

export interface IdentitySourceAssignment {
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
	assignedAt: string
	enabled: boolean
}

function mapAssignment(
	assignment: ModuleFolderAssignment,
): IdentitySourceAssignment {
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
		assignedAt: assignment.assignedAt,
		enabled: assignment.enabled,
	}
}

export async function listIdentitySourceAssignments(
	userId: string,
): Promise<IdentitySourceAssignment[]> {
	const assignments = await listModuleFolderAssignments(userId, 'identity')
	return assignments.map(mapAssignment)
}

export async function assignIdentitySourceFolder(input: {
	userId: string
	externalFolderId: string
	folderName: string
	folderPath?: string | null
	familyMemberId: string
	familyMemberName: string
	memberLabel: string
	mode?: 'add' | 'replace'
}): Promise<IdentitySourceAssignment[]> {
	const assignments = await assignModuleFolder({
		userId: input.userId,
		moduleId: 'identity',
		externalFolderId: input.externalFolderId,
		folderName: input.folderName,
		folderPath: input.folderPath,
		familyMemberId: input.familyMemberId,
		familyMemberName: input.familyMemberName,
		memberLabel: input.memberLabel,
		mode: input.mode,
	})

	return assignments.map(mapAssignment)
}

export async function removeIdentitySourceAssignment(
	userId: string,
	assignmentId: string,
): Promise<void> {
	await removeModuleFolderAssignment(userId, 'identity', assignmentId)
}

export async function clearIdentitySourceAssignments(
	userId: string,
): Promise<void> {
	const assignments = await listIdentitySourceAssignments(userId)

	for (const assignment of assignments) {
		await removeIdentitySourceAssignment(userId, assignment.id)
	}
}
