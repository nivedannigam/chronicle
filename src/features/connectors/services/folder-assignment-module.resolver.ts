import type { ChronicleModuleId } from '@/features/settings/types/chronicle-module.types'

export type FolderAssignmentModuleId = Extract<
	ChronicleModuleId,
	'health' | 'insurance' | 'vehicles'
>

export type FolderAssignmentModuleMode = FolderAssignmentModuleId | 'auto'

const INSURANCE_FOLDER_PATTERNS = [
	/^insurance$/i,
	/\binsurance policies?\b/i,
	/\bpolicy documents?\b/i,
]

const VEHICLE_FOLDER_PATTERNS = [
	/^vehicles?$/i,
	/^cars?$/i,
	/^automobiles?$/i,
	/\bvehicle documents?\b/i,
	/\bcar documents?\b/i,
]

function matchesAnyPattern(name: string, patterns: RegExp[]): boolean {
	return patterns.some((pattern) => pattern.test(name))
}

export function resolveFolderAssignmentModule(
	folderName: string,
	hints?: {
		externalFolderId?: string
		insuranceFolderIds?: Set<string>
		vehicleFolderIds?: Set<string>
	},
): FolderAssignmentModuleId {
	const externalFolderId = hints?.externalFolderId

	if (externalFolderId && hints?.insuranceFolderIds?.has(externalFolderId)) {
		return 'insurance'
	}

	if (externalFolderId && hints?.vehicleFolderIds?.has(externalFolderId)) {
		return 'vehicles'
	}

	const normalized = folderName.trim()

	if (matchesAnyPattern(normalized, INSURANCE_FOLDER_PATTERNS)) {
		return 'insurance'
	}

	if (matchesAnyPattern(normalized, VEHICLE_FOLDER_PATTERNS)) {
		return 'vehicles'
	}

	return 'health'
}

export function resolveActiveFolderAssignmentModule(
	moduleMode: FolderAssignmentModuleMode,
	folderName: string,
	hints?: {
		externalFolderId?: string
		insuranceFolderIds?: Set<string>
		vehicleFolderIds?: Set<string>
	},
): FolderAssignmentModuleId {
	if (moduleMode !== 'auto') {
		return moduleMode
	}

	return resolveFolderAssignmentModule(folderName, hints)
}

export const MODULE_FOLDER_LABELS: Record<FolderAssignmentModuleId, string> = {
	health: 'Health',
	insurance: 'Insurance',
	vehicles: 'Vehicles',
}
