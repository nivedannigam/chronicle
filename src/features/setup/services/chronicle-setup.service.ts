const STORAGE_KEY = 'chronicle-setup-v1'

export interface ChronicleRootFolder {
	externalFolderId: string
	folderName: string
	folderPath: string
}

export interface ChronicleSetupState {
	completed: boolean
	rootFolder: ChronicleRootFolder | null
	completedAt: string | null
}

const DEFAULT_STATE: ChronicleSetupState = {
	completed: false,
	rootFolder: null,
	completedAt: null,
}

function parseState(raw: string | null): ChronicleSetupState {
	if (!raw) {
		return DEFAULT_STATE
	}

	try {
		return { ...DEFAULT_STATE, ...JSON.parse(raw) }
	} catch {
		return DEFAULT_STATE
	}
}

export function readChronicleSetupState(): ChronicleSetupState {
	return parseState(localStorage.getItem(STORAGE_KEY))
}

export function writeChronicleSetupState(state: ChronicleSetupState): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function saveChronicleRootFolder(rootFolder: ChronicleRootFolder): void {
	const current = readChronicleSetupState()

	writeChronicleSetupState({
		...current,
		rootFolder,
	})
}

export function completeChronicleSetup(): ChronicleSetupState {
	const state: ChronicleSetupState = {
		...readChronicleSetupState(),
		completed: true,
		completedAt: new Date().toISOString(),
	}

	writeChronicleSetupState(state)
	return state
}

export function shouldShowSetupJourney(input: {
	driveConnected: boolean
	hasModuleAssignments: boolean
}): boolean {
	const state = readChronicleSetupState()

	if (state.completed) {
		return false
	}

	if (input.hasModuleAssignments) {
		return false
	}

	return !input.driveConnected || !state.rootFolder
}

export function resetChronicleSetupForDev(): void {
	localStorage.removeItem(STORAGE_KEY)
}
