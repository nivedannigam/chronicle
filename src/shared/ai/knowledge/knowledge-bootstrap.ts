import { HealthKnowledgePlatformAdapter } from '@/shared/ai/knowledge/health-knowledge.provider'
import { KnowledgeProviderRegistry } from '@/shared/ai/knowledge/knowledge-provider.registry'

export function createDefaultKnowledgeRegistry(): KnowledgeProviderRegistry {
	const registry = new KnowledgeProviderRegistry()
	registry.register(new HealthKnowledgePlatformAdapter())
	return registry
}

export function registerDefaultKnowledgeProviders(
	registry: KnowledgeProviderRegistry,
): KnowledgeProviderRegistry {
	if (!registry.get('health')) {
		registry.register(new HealthKnowledgePlatformAdapter())
	}
	return registry
}
