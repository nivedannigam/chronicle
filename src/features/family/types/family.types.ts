import type {
	FamilyMemberStatus,
	FamilyRoleId,
} from '@/types/database/family-foundation.types'

export interface Family {
	id: string
	name: string
	ownerUserId: string
	createdAt: string
	updatedAt: string
}

export interface FamilyRole {
	id: FamilyRoleId
	label: string
	description: string | null
	sortOrder: number
	permissions: Record<string, boolean>
}

export interface FamilyInvitation {
	id: string
	familyId: string
	email: string
	roleId: FamilyRoleId
	invitedByUserId: string
	status: 'pending' | 'accepted' | 'expired' | 'revoked'
	expiresAt: string | null
	createdAt: string
}

export interface MemberPreferences {
	id: string
	userId: string
	familyId: string
	selectedMemberId: string | null
	preferences: Record<string, unknown>
	updatedAt: string
}

export interface FamilyMember {
	id: string
	userId: string
	familyId: string | null
	displayName: string
	relationship: string
	isAccountOwner: boolean
	roleId: FamilyRoleId
	dateOfBirth: string | null
	gender: string | null
	status: FamilyMemberStatus
	avatarUrl: string | null
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
