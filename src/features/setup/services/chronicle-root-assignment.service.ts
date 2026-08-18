import { assignHealthSourceFolders } from '@/features/family/services/health-sources.service'
import { assignInsuranceSourceFolder } from '@/features/family/services/insurance-sources.service'
import { assignVehicleSourceFolder } from '@/features/family/services/vehicle-sources.service'
import { discoverInsuranceCategoriesFromFolderNames } from '@/features/insurance/services/insurance-folder-discovery.service'
import { runInsuranceImportSync } from '@/features/insurance-import/services/insurance-import-runner.service'
import { runVehicleImportSync } from '@/features/vehicle-import/services/vehicle-import-runner.service'
import { runHealthImportJourney } from '@/features/health-import/services/health-import-journey.service'
import type { DiscoveredModuleFolder } from '@/features/setup/services/chronicle-root-discovery.service'
import {
	completeChronicleSetup,
	saveChronicleRootFolder,
	type ChronicleRootFolder,
} from '@/features/setup/services/chronicle-setup.service'
import { invalidateAfterFolderAssignment } from '@/lib/query-invalidation'

export async function assignDiscoveredModuleFolders(input: {
	userId: string
	familyMemberId: string
	rootFolder: ChronicleRootFolder
	discovered: DiscoveredModuleFolder[]
}): Promise<void> {
	const activeFolders = input.discovered.filter((entry) => entry.active)

	for (const folder of activeFolders) {
		switch (folder.moduleId) {
			case 'health':
				await assignHealthSourceFolders({
					userId: input.userId,
					externalFolderId: folder.folderId,
					folderName: folder.folderName,
					familyMemberIds: [input.familyMemberId],
					mode: 'add',
				})
				break
			case 'insurance':
				await assignInsuranceSourceFolder({
					userId: input.userId,
					externalFolderId: folder.folderId,
					folderName: folder.folderName,
					folderPath: folder.folderPath,
					familyMemberId: input.familyMemberId,
					discoveredCategories: discoverInsuranceCategoriesFromFolderNames(
						folder.folderPath.split('/').filter(Boolean),
					).map((category) => category.id),
					mode: 'add',
				})
				break
			case 'vehicles':
				await assignVehicleSourceFolder({
					userId: input.userId,
					externalFolderId: folder.folderId,
					folderName: folder.folderName,
					folderPath: folder.folderPath,
					familyMemberId: input.familyMemberId,
					mode: 'add',
				})
				break
		}
	}

	saveChronicleRootFolder(input.rootFolder)
	completeChronicleSetup()
	invalidateAfterFolderAssignment(input.userId)

	// Organize in background — no blocking engineering journey UI during setup.
	const healthFolderIds = activeFolders
		.filter((folder) => folder.moduleId === 'health')
		.map((folder) => folder.folderId)

	void Promise.allSettled([
		runHealthImportJourney(
			input.userId,
			healthFolderIds,
			() => undefined,
		).catch(() => undefined),
		runInsuranceImportSync(input.userId).catch(() => undefined),
		runVehicleImportSync(input.userId).catch(() => undefined),
	])
}
