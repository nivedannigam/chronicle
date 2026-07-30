import type {
	ConnectorDiscoveryResult,
	ConnectorHealthCheck,
	ConnectorId,
	ConnectorSyncMode,
} from './ConnectorTypes'

export interface ConnectorContext {
	userId: string
}

export interface Connector {
	readonly id: ConnectorId
	readonly name: string
	connect(context: ConnectorContext): Promise<void>
	disconnect(context: ConnectorContext): Promise<void>
	refresh(context: ConnectorContext): Promise<void>
	discover(context: ConnectorContext): Promise<ConnectorDiscoveryResult>
	sync(context: ConnectorContext, mode?: ConnectorSyncMode): Promise<void>
	healthCheck(context: ConnectorContext): Promise<ConnectorHealthCheck>
}
