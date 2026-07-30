import type { Connector } from './Connector'
import type { ConnectorId } from './ConnectorTypes'

const registry = new Map<ConnectorId, Connector>()

export function registerConnector(connector: Connector): void {
	registry.set(connector.id, connector)
}

export function getConnector(id: ConnectorId): Connector | undefined {
	return registry.get(id)
}

export function getAllConnectors(): Connector[] {
	return [...registry.values()]
}

export function requireConnector(id: ConnectorId): Connector {
	const connector = getConnector(id)

	if (!connector) {
		throw new Error(`Connector not registered: ${id}`)
	}

	return connector
}
