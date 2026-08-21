import {
	assignModuleFolder,
	listModuleFolderAssignments,
	removeModuleFolderAssignment,
} from '@/features/settings/services/module-folder-assignments.service'
import type { ModuleFolderAssignment } from '@/features/settings/types/chronicle-module.types'

export interface FinanceSourceAssignment {
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
): FinanceSourceAssignment {
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

export async function listFinanceSourceAssignments(
	userId: string,
): Promise<FinanceSourceAssignment[]> {
	const assignments = await listModuleFolderAssignments(userId, 'finance')
	return assignments.map(mapAssignment)
}

export async function assignFinanceSourceFolder(input: {
	userId: string
	externalFolderId: string
	folderName: string
	folderPath?: string | null
	familyMemberId: string
	familyMemberName: string
	memberLabel: string
	mode?: 'add' | 'replace'
}): Promise<FinanceSourceAssignment[]> {
	const assignments = await assignModuleFolder({
		userId: input.userId,
		moduleId: 'finance',
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

export async function removeFinanceSourceAssignment(
	userId: string,
	assignmentId: string,
): Promise<void> {
	await removeModuleFolderAssignment(userId, 'finance', assignmentId)
}

export async function clearFinanceSourceAssignments(
	userId: string,
): Promise<void> {
	const assignments = await listFinanceSourceAssignments(userId)

	for (const assignment of assignments) {
		await removeFinanceSourceAssignment(userId, assignment.id)
	}
}
