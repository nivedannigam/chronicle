export interface GoogleDriveConnectionSettings {
	googleEmail?: string
}

export interface GoogleDriveConnectionDetails {
	status:
		'disconnected' | 'connecting' | 'connected' | 'error' | 'permission_revoked'
	googleEmail: string | null
	connectedAt: string | null
	lastError: string | null
}
