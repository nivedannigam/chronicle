export interface ModuleFolderAssignmentLike {
	id: string
	externalFolderId: string
	folderName: string
	folderPath?: string | null
}

export interface DiscoveredDriveFileLocation {
	folderExternalId: string
	folderPath?: string | null
}

export function resolveModuleFolderAssignmentForFile<
	T extends ModuleFolderAssignmentLike,
>(item: DiscoveredDriveFileLocation, assignments: T[]): T | null {
	const direct = assignments.find(
		(assignment) => assignment.externalFolderId === item.folderExternalId,
	)

	if (direct) {
		return direct
	}

	for (const assignment of assignments) {
		const rootPath = (assignment.folderPath ?? assignment.folderName).trim()
		const path = (item.folderPath ?? '').trim()

		if (!path || !rootPath) {
			continue
		}

		const normalizedRoot = rootPath.toLowerCase()
		const normalizedPath = path.toLowerCase()

		if (
			normalizedPath === normalizedRoot ||
			normalizedPath.startsWith(`${normalizedRoot}/`)
		) {
			return assignment
		}
	}

	return assignments.length === 1 ? assignments[0]! : null
}
