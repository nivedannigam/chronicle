import type { VehicleSourceAssignment } from '@/features/family/services/vehicle-sources.service'
import { resolveModuleFolderAssignmentForFile } from '@/features/connectors/services/module-folder-assignment-resolver'

export function resolveVehicleAssignmentForFile(
	item: {
		folderExternalId: string
		folderPath?: string | null
	},
	assignments: VehicleSourceAssignment[],
): VehicleSourceAssignment | null {
	return resolveModuleFolderAssignmentForFile(item, assignments)
}
