import type { Connector, ConnectorContext } from '@/core/connectors/Connector'
import {
	getAllConnectors,
	getConnector,
	requireConnector,
} from '@/core/connectors/ConnectorRegistry'
import type {
	ConnectorHealthCheck,
	ConnectorId,
	ConnectorSyncMode,
} from '@/core/connectors/ConnectorTypes'

export class ConnectorManager {
	getRegisteredConnectors(): Connector[] {
		return getAllConnectors()
	}

	getConnector(id: ConnectorId): Connector | undefined {
		return getConnector(id)
	}

	async connect(id: ConnectorId, context: ConnectorContext): Promise<void> {
		await requireConnector(id).connect(context)
	}

	async disconnect(id: ConnectorId, context: ConnectorContext): Promise<void> {
		await requireConnector(id).disconnect(context)
	}

	async refresh(id: ConnectorId, context: ConnectorContext): Promise<void> {
		await requireConnector(id).refresh(context)
	}

	async discover(id: ConnectorId, context: ConnectorContext) {
		return requireConnector(id).discover(context)
	}

	async sync(
		id: ConnectorId,
		context: ConnectorContext,
		mode: ConnectorSyncMode = 'manual',
	): Promise<void> {
		await requireConnector(id).sync(context, mode)
	}

	async healthCheck(
		id: ConnectorId,
		context: ConnectorContext,
	): Promise<ConnectorHealthCheck> {
		return requireConnector(id).healthCheck(context)
	}
}

export const connectorManager = new ConnectorManager()
