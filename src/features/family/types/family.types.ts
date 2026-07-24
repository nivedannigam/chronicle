export interface FamilyMember {
	id: string
	userId: string
	displayName: string
	relationship: string
	isAccountOwner: boolean
	sortOrder: number
	createdAt: string
	updatedAt: string
}

export interface FamilyMemberWithAliases extends FamilyMember {
	aliases: string[]
}

export interface HealthSourceAssignment {
	id: string
	userId: string
	connectorId: 'google-drive'
	folderId: string
	familyMemberId: string
	familyMemberName: string
	memberLabel: string
	externalFolderId: string
	folderName: string
	assignedAt: string
	enabled: boolean
}

export interface HealthSourceMemberGroup {
	member: FamilyMemberWithAliases
	memberLabel: string
	assignments: HealthSourceAssignment[]
}

export interface FolderMatchSuggestion {
	memberId: string
	memberLabel: string
	confidence: number
	reasons: string[]
}

export interface AssignmentSuccessInfo {
	memberLabels: string[]
	folderName: string
	externalFolderId: string
}

export type FolderAssignmentStep = 'suggest' | 'pick' | 'existing' | 'journey'

export type ExistingFolderMode = 'replace' | 'add'

export interface DiscoveredMedicalFile {
	externalFileId: string
	fileName: string
	mimeType: string
	folderName: string
	folderExternalId: string
	assignedMemberNames: string[]
}

export interface MedicalReportScanResult {
	success: boolean
	totalFiles: number
	byMember: Array<{
		familyMemberId: string
		familyMemberName: string
		folderNames: string[]
		fileCount: number
	}>
	discoveredFiles: DiscoveredMedicalFile[]
	unconfiguredMembers: FamilyMemberWithAliases[]
	error?: string
}

/** @deprecated Use HealthSourceAssignment */
export type HealthSourceMapping = HealthSourceAssignment
