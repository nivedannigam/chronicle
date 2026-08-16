import type { VehicleSourceAssignment } from '@/features/family/services/vehicle-sources.service'

export function resolveVehicleAssignmentForFile(
	item: {
		folderExternalId: string
		folderPath?: string | null
	},
	assignments: VehicleSourceAssignment[],
): VehicleSourceAssignment | null {
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

		if (
			path.toLowerCase() === rootPath.toLowerCase() ||
			path.toLowerCase().startsWith(`${rootPath.toLowerCase()}/`)
		) {
			return assignment
		}
	}

	return assignments.length === 1 ? assignments[0]! : null
}
