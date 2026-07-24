import { registerConnector } from '@/core/connectors'
import { googleDriveConnector } from '@/features/connectors/google-drive/services/google-drive.connector'

let initialized = false

export function initializeConnectors(): void {
	if (initialized) {
		return
	}

	registerConnector(googleDriveConnector)
	initialized = true
}

initializeConnectors()
