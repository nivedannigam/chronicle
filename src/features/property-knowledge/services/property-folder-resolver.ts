export function slugifyPropertyName(name: string): string {
	return name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

export function normalizePropertyDisplayName(name: string): string {
	return name.trim().replace(/\s+/g, ' ')
}

/**
 * Resolve the canonical property folder name from a Drive path.
 *
 * Example:
 *   Home/Pune Home/Property Tax/receipt.pdf → "Pune Home"
 *   Home/Nagpur Home/Registration/deed.pdf → "Nagpur Home"
 */
export function resolvePropertyNameFromPath(input: {
	folderPath?: string | null
	rootFolderPath?: string | null
	rootFolderName?: string | null
}): string {
	const path = (input.folderPath ?? '').trim()
	const rootPath = (input.rootFolderPath ?? input.rootFolderName ?? '').trim()

	if (!path) {
		return 'Other Property'
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
		return 'Other Property'
	}

	return normalizePropertyDisplayName(segments[0] ?? 'Other Property')
}

export function discoverPropertyNamesFromFolderPaths(
	folderPaths: string[],
	rootFolderPath?: string | null,
): string[] {
	const names = new Set<string>()

	for (const path of folderPaths) {
		const name = resolvePropertyNameFromPath({
			folderPath: path,
			rootFolderPath,
		})

		if (name !== 'Other Property') {
			names.add(name)
		}
	}

	return [...names]
}

export function isPropertyFolderPath(
	folderPath: string,
	rootFolderName?: string | null,
): boolean {
	const normalized = folderPath.toLowerCase()

	if (rootFolderName && normalized.includes(rootFolderName.toLowerCase())) {
		return true
	}

	return (
		/(^|\/)home(\/|$)/i.test(normalized) ||
		/(^|\/)property(\/|$)/i.test(normalized)
	)
}
