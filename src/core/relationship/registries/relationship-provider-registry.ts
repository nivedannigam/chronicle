import type { DomainEntityRegistration } from '@/core/relationship/contracts/entity-registry.contract'
import type { GraphDomainAdapter } from '@/shared/knowledge-graph/contracts/graph-domain-adapter.contract'
import type { ChronicleEntityType } from '@/shared/knowledge-graph/types/entity.types'

const adapters = new Map<string, GraphDomainAdapter>()
const entityRegistrations = new Map<string, DomainEntityRegistration>()

export function registerRelationshipProvider(
	adapter: GraphDomainAdapter,
): void {
	adapters.set(adapter.providerId, adapter)
	entityRegistrations.set(adapter.providerId, {
		domain: adapter.domain,
		providerId: adapter.providerId,
		entityTypes: adapter.entityTypes,
	})
}

export function unregisterRelationshipProvider(providerId: string): void {
	adapters.delete(providerId)
	entityRegistrations.delete(providerId)
}

export function clearRelationshipProviders(): void {
	adapters.clear()
	entityRegistrations.clear()
}

export function getRelationshipProvider(
	providerId: string,
): GraphDomainAdapter | undefined {
	return adapters.get(providerId)
}

export function getRegisteredRelationshipProviders(): GraphDomainAdapter[] {
	return [...adapters.values()]
}

export function getRegisteredRelationshipProviderIds(): string[] {
	return [...adapters.keys()]
}

export function getRegisteredEntityTypes(): DomainEntityRegistration[] {
	return [...entityRegistrations.values()]
}

export function getEntityTypesForDomain(
	domain: DomainEntityRegistration['domain'],
): ChronicleEntityType[] {
	const types = new Set<ChronicleEntityType>()

	for (const registration of entityRegistrations.values()) {
		if (registration.domain === domain) {
			for (const type of registration.entityTypes) {
				types.add(type)
			}
		}
	}

	return [...types]
}
