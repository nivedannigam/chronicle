import type { VehicleCategoryId } from '@/features/vehicle-knowledge/types/vehicle-knowledge.types'

export function slugifyVehicleName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

export function resolveVehicleNameFromPath(input: {
	folderPath?: string | null
	rootFolderPath?: string | null
	rootFolderName?: string | null
}): string {
	const path = (input.folderPath ?? '').trim()
	const rootPath = (input.rootFolderPath ?? input.rootFolderName ?? '').trim()

	if (!path) {
		return 'Other Vehicle'
	}

	let relative = path

	if (rootPath && path.toLowerCase().startsWith(rootPath.toLowerCase())) {
		relative = path.slice(rootPath.length).replace(/^\/+/, '')
	} else if (input.rootFolderName) {
		const rootIndex = path
			.toLowerCase()
			.indexOf(input.rootFolderName.toLowerCase())

		if (rootIndex >= 0) {
			relative = path
				.slice(rootIndex + input.rootFolderName.length)
				.replace(/^\/+/, '')
		}
	}

	const segments = relative.split('/').filter(Boolean)

	if (segments.length === 0) {
		return 'Other Vehicle'
	}

	return segments[0] ?? 'Other Vehicle'
}

export function inferVehicleCategory(name: string): VehicleCategoryId {
	const normalized = name.toLowerCase()

	if (
		/(bike|scooter|two\s*wheeler|2w|motorcycle|activa|pulsar|splendor)/i.test(
			normalized,
		)
	) {
		return 'two_wheeler'
	}

	if (/(car|suv|sedan|hatch|xev|ev|vehicle)/i.test(normalized)) {
		return 'car'
	}

	return 'other'
}

export function discoverVehicleNamesFromFolderPaths(
	folderPaths: string[],
	rootFolderPath?: string | null,
): string[] {
	const names = new Set<string>()

	for (const path of folderPaths) {
		const name = resolveVehicleNameFromPath({
			folderPath: path,
			rootFolderPath,
		})

		if (name !== 'Other Vehicle') {
			names.add(name)
		}
	}

	return [...names]
}
