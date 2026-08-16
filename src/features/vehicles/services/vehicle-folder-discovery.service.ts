import { discoverVehicleNamesFromFolderPaths } from '@/features/vehicle-knowledge/utils/vehicle-folder-resolver'

export function discoverVehicleNamesFromFolderNames(
	folderNames: string[],
): string[] {
	return discoverVehicleNamesFromFolderPaths(folderNames)
}
