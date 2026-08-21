import { resolveFolderAssignmentModule } from '@/features/connectors/services/folder-assignment-module.resolver'

export type DiscoverableModuleId =
	| 'health'
	| 'insurance'
	| 'vehicles'
	| 'identity'
	| 'property'
	| 'finance'
	| 'travel'

export interface DriveChildFolder {
	id: string
	name: string
}

export interface DiscoveredModuleFolder {
	moduleId: DiscoverableModuleId
	folderId: string
	folderName: string
	folderPath: string
	active: boolean
}

export interface ChronicleRootDiscoveryResult {
	recognized: DiscoveredModuleFolder[]
	unrecognized: DriveChildFolder[]
}

const COMING_SOON_PATTERNS: Record<
	Exclude<
		DiscoverableModuleId,
		'health' | 'insurance' | 'vehicles' | 'finance'
	>,
	RegExp[]
> = {
	identity: [/^identity$/i, /^passports?$/i, /^ids?$/i],
	property: [/^property$/i, /^real estate$/i, /^home$/i],
	travel: [/^travel$/i, /^trips?$/i],
}

const FINANCE_FOLDER_PATTERNS = [/^finance$/i, /^banking$/i, /^money$/i]

const HEALTH_FOLDER_PATTERNS = [
	/^health$/i,
	/^medical$/i,
	/\blab reports?\b/i,
	/\bhealth records?\b/i,
]

function matchesAnyPattern(name: string, patterns: RegExp[]): boolean {
	return patterns.some((pattern) => pattern.test(name.trim()))
}

function resolveActiveModuleFolder(
	folderName: string,
): 'health' | 'insurance' | 'vehicles' | 'finance' | null {
	const moduleId = resolveFolderAssignmentModule(folderName)

	if (moduleId === 'insurance' || moduleId === 'vehicles') {
		return moduleId
	}

	if (matchesAnyPattern(folderName, FINANCE_FOLDER_PATTERNS)) {
		return 'finance'
	}

	return matchesAnyPattern(folderName, HEALTH_FOLDER_PATTERNS) ? 'health' : null
}

function resolveComingSoonModule(
	folderName: string,
): Exclude<
	DiscoverableModuleId,
	'health' | 'insurance' | 'vehicles' | 'finance'
> | null {
	for (const [moduleId, patterns] of Object.entries(COMING_SOON_PATTERNS) as [
		Exclude<
			DiscoverableModuleId,
			'health' | 'insurance' | 'vehicles' | 'finance'
		>,
		RegExp[],
	][]) {
		if (matchesAnyPattern(folderName, patterns)) {
			return moduleId
		}
	}

	return null
}

function buildFolderPath(rootPath: string, folderName: string): string {
	const root = rootPath.trim()
	const child = folderName.trim()

	if (!root) {
		return child
	}

	return `${root}/${child}`
}

/** Discover supported module folders under a Chronicle root folder. */
export function discoverModuleFoldersFromRoot(input: {
	rootFolderId: string
	rootFolderName: string
	rootFolderPath?: string | null
	childFolders: DriveChildFolder[]
}): ChronicleRootDiscoveryResult {
	const rootPath = input.rootFolderPath ?? input.rootFolderName
	const recognized: DiscoveredModuleFolder[] = []
	const unrecognized: DriveChildFolder[] = []

	for (const child of input.childFolders) {
		const comingSoonModule = resolveComingSoonModule(child.name)
		const folderPath = buildFolderPath(rootPath, child.name)

		if (comingSoonModule) {
			recognized.push({
				moduleId: comingSoonModule,
				folderId: child.id,
				folderName: child.name,
				folderPath,
				active: false,
			})
			continue
		}

		const activeModule = resolveActiveModuleFolder(child.name)

		if (activeModule) {
			const alreadyAdded = recognized.some(
				(entry) => entry.moduleId === activeModule,
			)

			if (!alreadyAdded) {
				recognized.push({
					moduleId: activeModule,
					folderId: child.id,
					folderName: child.name,
					folderPath,
					active: true,
				})
			}

			continue
		}

		unrecognized.push(child)
	}

	return { recognized, unrecognized }
}

export function formatDiscoveredModuleLabel(
	moduleId: DiscoverableModuleId,
): string {
	switch (moduleId) {
		case 'health':
			return 'Health'
		case 'insurance':
			return 'Insurance'
		case 'vehicles':
			return 'Vehicles'
		case 'identity':
			return 'Identity'
		case 'property':
			return 'Property'
		case 'finance':
			return 'Finance'
		case 'travel':
			return 'Travel'
		default:
			return moduleId
	}
}
