import type { ModuleFolderAssignment } from '@/features/settings/types/chronicle-module.types'

const STORAGE_PREFIX = 'chronicle:module-folder-assignments:'

function storageKey(userId: string, moduleId: string): string {
	return `${STORAGE_PREFIX}${moduleId}:${userId}`
}

function readAssignments(
	userId: string,
	moduleId: string,
): ModuleFolderAssignment[] {
	if (typeof window === 'undefined') {
		return []
	}

	try {
		const raw = window.localStorage.getItem(storageKey(userId, moduleId))
		return raw ? (JSON.parse(raw) as ModuleFolderAssignment[]) : []
	} catch {
		return []
	}
}

function writeAssignments(
	userId: string,
	moduleId: string,
	assignments: ModuleFolderAssignment[],
): void {
	if (typeof window === 'undefined') {
		return
	}

	window.localStorage.setItem(
		storageKey(userId, moduleId),
		JSON.stringify(assignments),
	)
}

export async function listModuleFolderAssignments(
	userId: string,
	moduleId: ModuleFolderAssignment['moduleId'],
): Promise<ModuleFolderAssignment[]> {
	return readAssignments(userId, moduleId)
}

export async function assignModuleFolder(input: {
	userId: string
	moduleId: ModuleFolderAssignment['moduleId']
	externalFolderId: string
	folderName: string
	folderPath?: string | null
	familyMemberId: string
	familyMemberName: string
	memberLabel: string
	mode?: 'add' | 'replace'
}): Promise<ModuleFolderAssignment[]> {
	const existing = readAssignments(input.userId, input.moduleId)
	const now = new Date().toISOString()

	let next = existing

	if (input.mode === 'replace') {
		next = existing.filter(
			(assignment) => assignment.familyMemberId !== input.familyMemberId,
		)
	}

	const duplicate = next.find(
		(assignment) =>
			assignment.externalFolderId === input.externalFolderId &&
			assignment.familyMemberId === input.familyMemberId,
	)

	if (duplicate) {
		next = next.map((assignment) =>
			assignment.id === duplicate.id
				? {
						...assignment,
						folderName: input.folderName,
						folderPath: input.folderPath ?? assignment.folderPath,
						assignedAt: now,
					}
				: assignment,
		)
	} else {
		next = [
			...next,
			{
				id: crypto.randomUUID(),
				userId: input.userId,
				moduleId: input.moduleId,
				connectorId: 'google-drive',
				folderId: input.externalFolderId,
				familyMemberId: input.familyMemberId,
				familyMemberName: input.familyMemberName,
				memberLabel: input.memberLabel,
				externalFolderId: input.externalFolderId,
				folderName: input.folderName,
				folderPath: input.folderPath ?? null,
				assignedAt: now,
				enabled: true,
			},
		]
	}

	writeAssignments(input.userId, input.moduleId, next)

	return next
}

export async function removeModuleFolderAssignment(
	userId: string,
	moduleId: ModuleFolderAssignment['moduleId'],
	assignmentId: string,
): Promise<void> {
	const next = readAssignments(userId, moduleId).filter(
		(assignment) => assignment.id !== assignmentId,
	)

	writeAssignments(userId, moduleId, next)
}

export async function clearModuleFolderAssignments(
	userId: string,
	moduleId: ModuleFolderAssignment['moduleId'],
): Promise<void> {
	writeAssignments(userId, moduleId, [])
}

export function buildDriveFolderUrl(externalFolderId: string): string {
	return `https://drive.google.com/drive/folders/${externalFolderId}`
}

export function formatLastScannedLabel(
	iso: string | null | undefined,
): string | null {
	if (!iso) {
		return null
	}

	const parsed = Date.parse(iso)

	if (Number.isNaN(parsed)) {
		return null
	}

	const date = new Date(parsed)
	const now = new Date()
	const isToday =
		date.getDate() === now.getDate() &&
		date.getMonth() === now.getMonth() &&
		date.getFullYear() === now.getFullYear()

	if (isToday) {
		return `Today ${date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
		})}`
	}

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}
