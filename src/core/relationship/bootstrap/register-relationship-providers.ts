import { documentsGraphAdapter } from '@/shared/knowledge-graph/adapters/documents-graph.adapter'
import { healthGraphAdapter } from '@/shared/knowledge-graph/adapters/health-graph.adapter'
import { insuranceGraphAdapter } from '@/shared/knowledge-graph/adapters/insurance-graph.adapter'
import { defaultKnowledgeGraphService } from '@/shared/knowledge-graph/services/knowledge-graph.service'
import { registerRelationshipProvider } from '@/core/relationship/registries/relationship-provider-registry'

let providersRegistered = false

/** Registers Health, Insurance, and Documents graph adapters with the relationship platform. */
export function registerRelationshipProviders(): void {
	if (providersRegistered) {
		return
	}

	providersRegistered = true

	for (const adapter of [
		healthGraphAdapter,
		insuranceGraphAdapter,
		documentsGraphAdapter,
	]) {
		registerRelationshipProvider(adapter)
		defaultKnowledgeGraphService.registerAdapter(adapter)
	}
}

/** Test helper — allows re-registration after clearing provider state. */
export function resetRelationshipProviderRegistrationGuard(): void {
	providersRegistered = false
}

export function areRelationshipProvidersRegistered(): boolean {
	return providersRegistered
}
