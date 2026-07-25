import type {
	ChronicleTimelineEvent,
	TimelineFilters,
	TimelineSources,
} from '@/features/timeline/types/timeline.types'

/** Domain-agnostic query passed to every Timeline Provider. */
export interface TimelineProviderQuery {
	userId: string
	memberId?: string | null
	memberName?: string | null
	sources: TimelineSources
	filters?: TimelineFilters
}

/**
 * Chronicle Timeline Provider contract.
 * Future modules register themselves and contribute life events dynamically.
 */
export interface ChronicleTimelineProvider {
	readonly id: string
	readonly module: ChronicleTimelineEvent['sourceModule']
	readonly label: string
	readonly priority?: number

	supports(query: TimelineProviderQuery): boolean
	getEvents(query: TimelineProviderQuery): ChronicleTimelineEvent[]
}
