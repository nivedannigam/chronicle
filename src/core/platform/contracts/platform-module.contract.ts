import type { KnowledgeDomain } from '@chronicle/core-knowledge'
import type { ChronicleModuleId } from '@/features/settings/types/chronicle-module.types'
import type { TimelineModule } from '@/features/timeline/types/timeline.types'

/** Platform modules — includes future domains beyond current settings modules. */
export type PlatformModuleId =
	| ChronicleModuleId
	| 'identity'
	| 'property'
	| 'travel'
	| 'employment'
	| 'education'

/**
 * Chronicle platform module definition.
 * Domain modules register here so shared services can discover capabilities.
 */
export interface ChroniclePlatformModule {
	readonly id: PlatformModuleId
	readonly label: string
	readonly knowledgeDomain?: KnowledgeDomain
	readonly routePrefix: string
	readonly enabled: boolean
	readonly comingSoon?: boolean
	readonly timelineModule?: TimelineModule
	readonly settingsPath?: string
	readonly askPath?: string
	readonly documentsCategoryIds?: string[]
}
