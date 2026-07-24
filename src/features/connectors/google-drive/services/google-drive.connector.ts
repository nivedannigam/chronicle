import type { Connector, ConnectorContext } from '@/core/connectors/Connector'
import type {
	ConnectorConnectionStatus,
	ConnectorHealthCheck,
	ConnectorSyncMode,
} from '@/core/connectors/ConnectorTypes'
import {
	getConnectorConnection,
	getLatestSyncRun,
	listRegistryRecords,
	upsertConnectorConnection,
} from '@/features/connectors/services/connector-store.service'
import {
	connectGoogleDriveIncremental,
	disconnectGoogleDrive,
	finalizeGoogleDriveConnection,
	verifyGoogleDriveConnection,
} from '@/features/connectors/google-drive/services/google-drive-auth.service'
import { discoverGoogleDriveDocuments } from '@/features/connectors/google-drive/services/google-drive-discovery.service'
import { runGoogleDriveSync } from '@/features/connectors/google-drive/services/google-drive-sync.service'

async function readConnectionStatus(
	userId: string,
): Promise<ConnectorConnectionStatus> {
	const connection = await getConnectorConnection(userId, 'google-drive')

	if (!connection) {
		return 'disconnected'
	}

	return (connection.status as ConnectorConnectionStatus) ?? 'disconnected'
}

export class GoogleDriveConnector implements Connector {
	readonly id = 'google-drive' as const
	readonly name = 'Google Drive'

	async connect(_context: ConnectorContext): Promise<void> {
		void _context
		await connectGoogleDriveIncremental()
	}

	async disconnect(context: ConnectorContext): Promise<void> {
		await disconnectGoogleDrive(context.userId)

		await upsertConnectorConnection({
			userId: context.userId,
			connectorId: 'google-drive',
			status: 'disconnected',
			clearConnection: true,
		})
	}

	async refresh(context: ConnectorContext): Promise<void> {
		const connection = await getConnectorConnection(
			context.userId,
			'google-drive',
		)

		if (connection?.status === 'connecting') {
			const finalized = await finalizeGoogleDriveConnection(context.userId)

			if (finalized.connected) {
				await upsertConnectorConnection({
					userId: context.userId,
					connectorId: 'google-drive',
					status: 'connected',
					scopes: ['https://www.googleapis.com/auth/drive.readonly'],
					settings: { googleEmail: finalized.googleEmail ?? undefined },
				})
			}

			return
		}

		if (connection?.status === 'connected') {
			const verified = await verifyGoogleDriveConnection(context.userId)

			if (!verified.connected) {
				await upsertConnectorConnection({
					userId: context.userId,
					connectorId: 'google-drive',
					status: 'permission_revoked',
					lastError: verified.error ?? 'Google Drive access was revoked',
					clearConnection: true,
				})
			}
		}
	}

	async discover(context: ConnectorContext) {
		return discoverGoogleDriveDocuments({ userId: context.userId })
	}

	async sync(
		context: ConnectorContext,
		mode: ConnectorSyncMode = 'manual',
	): Promise<void> {
		await runGoogleDriveSync({ userId: context.userId, mode })
	}

	async healthCheck(context: ConnectorContext): Promise<ConnectorHealthCheck> {
		const status = await readConnectionStatus(context.userId)
		const registry = await listRegistryRecords(context.userId, 'google-drive')
		const latestSync = await getLatestSyncRun(context.userId, 'google-drive')
		const pending = registry.filter(
			(record) =>
				record.importStatus !== 'completed' && record.importStatus !== 'failed',
		).length
		const failed = registry.filter(
			(record) => record.importStatus === 'failed',
		).length

		return {
			ok: status === 'connected' && failed === 0,
			message:
				status === 'connected'
					? 'Google Drive connector is connected'
					: 'Google Drive is not connected',
			lastSyncAt: latestSync?.completedAt ?? latestSync?.startedAt ?? null,
			pendingCount: pending,
			failedCount: failed,
		}
	}
}

export const googleDriveConnector = new GoogleDriveConnector()
