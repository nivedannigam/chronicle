import { listHealthSourceAssignments } from '@/features/family/services/health-sources.service'
import { listInsuranceSourceAssignments } from '@/features/family/services/insurance-sources.service'
import { listVehicleSourceAssignments } from '@/features/family/services/vehicle-sources.service'

export function isInsuranceRegistryRow(row: {
	targetModule?: string | null
	discoveryCategory?: string | null
}): boolean {
	return (
		row.targetModule === 'insurance' ||
		row.discoveryCategory === 'insurance_policy'
	)
}

export function isVehicleRegistryRow(row: {
	targetModule?: string | null
	discoveryCategory?: string | null
}): boolean {
	return (
		row.targetModule === 'vehicles' ||
		row.discoveryCategory === 'vehicle_document'
	)
}

export async function listInsuranceAssignedExternalFolderIds(
	userId: string,
): Promise<Set<string>> {
	const assignments = await listInsuranceSourceAssignments(userId)

	return new Set(
		assignments
			.filter((assignment) => assignment.enabled)
			.map((assignment) => assignment.externalFolderId)
			.filter(Boolean),
	)
}

export async function listVehicleAssignedExternalFolderIds(
	userId: string,
): Promise<Set<string>> {
	const assignments = await listVehicleSourceAssignments(userId)

	return new Set(
		assignments
			.filter((assignment) => assignment.enabled)
			.map((assignment) => assignment.externalFolderId)
			.filter(Boolean),
	)
}

export async function resolveHealthDiscoveryFolderIds(
	userId: string,
	requestedFolderIds?: string[],
): Promise<string[]> {
	const [healthAssignments, insuranceFolderIds, vehicleFolderIds] =
		await Promise.all([
			listHealthSourceAssignments(userId),
			listInsuranceAssignedExternalFolderIds(userId),
			listVehicleAssignedExternalFolderIds(userId),
		])

	const excludedFolderIds = new Set([
		...insuranceFolderIds,
		...vehicleFolderIds,
	])

	const eligibleFolderIds = [
		...new Set(
			healthAssignments
				.map((assignment) => assignment.externalFolderId)
				.filter((folderId) => folderId && !excludedFolderIds.has(folderId)),
		),
	]

	if (requestedFolderIds && requestedFolderIds.length > 0) {
		return requestedFolderIds.filter(
			(folderId) =>
				eligibleFolderIds.includes(folderId) &&
				!excludedFolderIds.has(folderId),
		)
	}

	return eligibleFolderIds
}

export async function isInsuranceAssignedFolder(
	userId: string,
	externalFolderId: string,
): Promise<boolean> {
	const insuranceFolderIds =
		await listInsuranceAssignedExternalFolderIds(userId)

	return insuranceFolderIds.has(externalFolderId)
}
