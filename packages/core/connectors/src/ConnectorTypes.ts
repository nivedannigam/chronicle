export type ConnectorId =
	| 'google-drive'
	| 'google-photos'
	| 'gmail'
	| 'google-calendar'
	| 'onedrive'
	| 'dropbox'
	| 'apple-health'
	| 'fitbit'
	| 'garmin'

export type ConnectorConnectionStatus =
	'disconnected' | 'connecting' | 'connected' | 'error' | 'permission_revoked'

export type ConnectorSyncMode = 'initial' | 'incremental' | 'manual'

export type ImportQueueStatus =
	| 'discovered'
	| 'queued'
	| 'downloading'
	| 'imported'
	| 'ocr'
	| 'parsing'
	| 'knowledge_graph'
	| 'completed'
	| 'failed'
	| 'retry'
	| 'skipped'
	| 'cancelled'

export type DocumentRegistryStatus =
	| 'discovered'
	| 'imported'
	| 'processing'
	| 'completed'
	| 'failed'
	| 'deleted'
	| 'duplicate'

export type DiscoveryCategory =
	'likely_medical' | 'needs_review' | 'ignored' | 'insurance_policy'

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'

export interface ConnectorFolder {
	id: string
	connectorId: ConnectorId
	userId: string
	externalFolderId: string
	displayName: string
	alias: string
	enabled: boolean
	createdAt: string
	updatedAt: string
}

export interface ConnectorDocumentRecord {
	id: string
	userId: string
	connectorId: ConnectorId
	externalFileId: string
	fileName: string
	mimeType: string
	checksum: string
	fileSize: number
	externalCreatedAt: string | null
	externalModifiedAt: string | null
	folderId: string | null
	importedAt: string | null
	lastSyncAt: string | null
	registryStatus: DocumentRegistryStatus
	importStatus: ImportQueueStatus
	healthReportId: string | null
	insuranceDocumentId: string | null
	targetModule: string | null
	knowledgeGraphStatus: string | null
	errorMessage: string | null
	familyMemberId: string | null
	folderPath: string | null
	discoveryCategory: DiscoveryCategory | null
	discoveryConfidence: number | null
	discoveryReason: string | null
	sha256Checksum: string | null
	approvalStatus: ApprovalStatus | null
	detectedPatient: string | null
	detectedReportDate: string | null
	detectedReportType: string | null
}

export interface ConnectorSyncRun {
	id: string
	userId: string
	connectorId: ConnectorId
	mode: ConnectorSyncMode
	status: 'pending' | 'running' | 'completed' | 'failed' | 'partial'
	startedAt: string
	completedAt: string | null
	filesDiscovered: number
	filesQueued: number
	filesImported: number
	filesFailed: number
	errorMessage: string | null
}

export interface ConnectorHealthCheck {
	ok: boolean
	message: string
	lastSyncAt: string | null
	pendingCount: number
	failedCount: number
}

export interface ConnectorDiscoveryItem {
	externalFileId: string
	fileName: string
	mimeType: string
	fileSize: number
	checksum: string
	externalCreatedAt: string
	externalModifiedAt: string
	folderExternalId: string
	folderPath?: string
}

export interface ConnectorDiscoveryResult {
	items: ConnectorDiscoveryItem[]
	hasMore: boolean
	nextPageToken: string | null
}

export interface DriveBrowseFolder {
	id: string
	name: string
	parentId: string | null
}

export interface DriveBrowseFile {
	id: string
	name: string
	mimeType: string
	modifiedAt: string
	iconUrl: string | null
}

export interface DriveBrowseResult {
	folders: DriveBrowseFolder[]
	files: DriveBrowseFile[]
	currentFolderId: string
	currentFolderName: string
	parentFolderId: string | null
	nextPageToken: string | null
}
