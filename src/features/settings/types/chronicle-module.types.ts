/** Chronicle modules that share the connected-folder + settings architecture. */
export type ChronicleModuleId =
	'health' | 'insurance' | 'vehicles' | 'identity' | 'finance' | 'documents'

export interface ModuleFolderAssignment {
	id: string
	userId: string
	moduleId: ChronicleModuleId
	connectorId: string
	folderId: string
	familyMemberId: string
	familyMemberName: string
	memberLabel: string
	externalFolderId: string
	folderName: string
	folderPath: string | null
	assignedAt: string
	enabled: boolean
}

export interface ModuleConnectedFolderSnapshot {
	moduleLabel: string
	driveConnected: boolean
	driveEmail: string | null
	folderName: string | null
	folderPath: string | null
	externalFolderId: string | null
	documentCount: number
	lastScannedLabel: string | null
}
