import { HealthKnowledgePlatformAdapter } from '@/shared/ai/knowledge/health-knowledge.provider'
import type {
	KnowledgeProvider,
	KnowledgeRetrievalInput,
	NormalizedKnowledge,
} from '@/shared/ai/types/knowledge.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'

export class KnowledgeProviderRegistry {
	private readonly providers = new Map<KnowledgeDomainId, KnowledgeProvider>()

	register(provider: KnowledgeProvider): void {
		this.providers.set(provider.domain, provider)
	}

	get(domain: KnowledgeDomainId): KnowledgeProvider | undefined {
		return this.providers.get(domain)
	}

	async retrieve(input: KnowledgeRetrievalInput): Promise<NormalizedKnowledge> {
		const provider = this.get(input.domain)

		if (!provider) {
			return {
				domain: input.domain,
				intent: input.intent,
				question: input.question,
				reports: [],
				metrics: [],
				insights: [],
				alerts: [],
				evidence: [],
				summaryLines: [],
				coverageNotes: [
					`No knowledge provider registered for domain "${input.domain}".`,
				],
				dataAvailable: false,
			}
		}

		return provider.retrieve(input)
	}
}

export const defaultKnowledgeProviderRegistry = new KnowledgeProviderRegistry()
defaultKnowledgeProviderRegistry.register(new HealthKnowledgePlatformAdapter())
