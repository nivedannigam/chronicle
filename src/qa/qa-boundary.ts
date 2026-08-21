import type { ConnectorConnectionStatus, ConnectorId } from '@/core/connectors'
import { QA_USER_ID } from '@/qa/qa-constants'
import { getQaDataset } from '@/qa/qa-repository'
import { assertQaUserId } from '@/qa/qa-repository'
import { isQaModeEnabled } from '@/qa/qa-mode'

const NOW = '2026-01-01T00:00:00.000Z'

export function qaInterceptConnectorConnection(
	userId: string,
	connectorId: ConnectorId,
): Record<string, unknown> | null | undefined {
	if (!assertQaUserId(userId)) {
		return undefined
	}

	const flags = getQaDataset()?.flags

	if (!flags?.driveConnected) {
		return null
	}

	return {
		user_id: userId,
		connector_id: connectorId,
		status: 'connected' satisfies ConnectorConnectionStatus,
		connected_at: NOW,
		settings: {
			googleEmail: 'qa-drive@chronicle.local',
		},
		last_error: null,
	}
}

export function qaInterceptRegistryRecords(userId: string) {
	if (!assertQaUserId(userId)) {
		return undefined
	}

	return []
}

export function qaInterceptConnectorFolders(userId: string) {
	if (!assertQaUserId(userId)) {
		return undefined
	}

	return []
}

export function qaInterceptLatestSyncRun(userId: string) {
	if (!assertQaUserId(userId)) {
		return undefined
	}

	return null
}

export function qaShouldBypassRemoteTables(userId: string): boolean {
	return isQaModeEnabled() && userId === QA_USER_ID
}
