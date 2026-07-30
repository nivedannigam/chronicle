import type {
	ConnectorConnectionStatus,
	ImportQueueStatus,
} from './ConnectorTypes'

export function isConnectorConnected(
	status: ConnectorConnectionStatus,
): boolean {
	return status === 'connected'
}

export function isImportQueueTerminal(status: ImportQueueStatus): boolean {
	return status === 'completed' || status === 'failed'
}

export function isImportQueueActive(status: ImportQueueStatus): boolean {
	return !isImportQueueTerminal(status) && status !== 'retry'
}

export const IMPORT_QUEUE_LABELS: Record<ImportQueueStatus, string> = {
	discovered: 'Discovered',
	queued: 'Queued',
	downloading: 'Downloading',
	imported: 'Imported',
	ocr: 'OCR',
	parsing: 'Parsing',
	knowledge_graph: 'Knowledge Graph',
	completed: 'Completed',
	failed: 'Failed',
	retry: 'Retry',
	skipped: 'Skipped',
	cancelled: 'Cancelled',
}

export const CONNECTION_STATUS_LABELS: Record<
	ConnectorConnectionStatus,
	string
> = {
	disconnected: 'Not connected',
	connecting: 'Connecting…',
	connected: 'Connected',
	error: 'Error',
	permission_revoked: 'Permission revoked',
}
