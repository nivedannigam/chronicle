export type DiscoveryCategory = 'likely_medical' | 'needs_review' | 'ignored'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export type DiscoveryRunMode = 'manual' | 'background' | 'incremental'

export type DiscoveryRunStatus =
	'running' | 'completed' | 'failed' | 'cancelled'

export interface ScoredMedicalFile {
	fileId: string
	name: string
	mimeType: string
	modifiedTime: string
	size: number
	folderPath: string
	folderExternalId: string
	confidence: number
	reason: string
	category: DiscoveryCategory
	familyMemberIds: string[]
}

export interface DiscoveryDashboardStats {
	totalFiles: number
	medicalReports: number
	ignored: number
	needsReview: number
	lastScanAt: string | null
	foldersScanned: number
}

export interface DiscoveryRunSummary {
	id: string
	mode: DiscoveryRunMode
	status: DiscoveryRunStatus
	startedAt: string
	completedAt: string | null
	foldersScanned: number
	filesScanned: number
	medicalCount: number
	reviewCount: number
	ignoredCount: number
	duplicateCount: number
	errorMessage: string | null
}

export interface DiscoveryFilter {
	category?: DiscoveryCategory | 'all'
}

export interface ReviewDocument {
	registryId: string
	fileId: string
	fileName: string
	mimeType: string
	modifiedTime: string
	folderPath: string
	confidence: number
	reason: string
	category: DiscoveryCategory
	approvalStatus: ApprovalStatus
	importStatus: string
	errorMessage: string | null
	familyMemberId: string | null
	familyMemberName: string | null
	detectedPatient: string | null
	detectedReportDate: string | null
	detectedReportType: string | null
}

export type ReviewQueueFilter = 'pending' | 'actionable' | 'all'

export interface ImportPipelineSummary {
	imported: number
	skipped: number
	duplicates: number
	errors: number
	lastError: string | null
	errorSamples: string[]
}

export type DiscoveryFilterTab =
	'all' | 'likely_medical' | 'needs_review' | 'ignored'
