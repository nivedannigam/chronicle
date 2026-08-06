import type { SemanticSearchHit } from '@chronicle/core-knowledge'
import type { KnowledgeProviderQuery } from '@chronicle/core-knowledge'
import type { PlatformModuleId } from '@/core/platform/contracts/platform-module.contract'

/** Optional search contributor beyond knowledge providers. */
export interface ChronicleSearchContributor {
	readonly id: string
	readonly moduleId: PlatformModuleId
	readonly label: string
	readonly priority?: number

	supports(query: KnowledgeProviderQuery): boolean
	search(query: KnowledgeProviderQuery): SemanticSearchHit[]
}
