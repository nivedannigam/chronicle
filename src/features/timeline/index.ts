export { TimelinePage } from '@/features/timeline/pages/TimelinePage'
export { HomeLifeTimeline } from '@/features/timeline/components/HomeLifeTimeline'
export { TimelineEventRow } from '@/features/timeline/components/TimelineEventRow'
export {
	useTimelineEvents,
	useTimelinePreview,
	useTimelineSources,
} from '@/features/timeline/hooks/useTimelineEvents'
export {
	buildTimelineEvents,
	buildTimelinePreview,
	filterTimelineEvents,
	resolveTimelineYearFilter,
} from '@/features/timeline/engine/timeline-engine'
export { groupTimelineByMonth } from '@/features/timeline/engine/timeline-grouping'
export {
	registerTimelineProvider,
	getRegisteredTimelineProviders,
} from '@/features/timeline/registry/timeline-registry'
export type {
	ChronicleTimelineEvent,
	TimelineBuildResult,
	TimelineEventType,
	TimelineFilters,
	TimelineImportance,
	TimelineModule,
	TimelineMonthGroup,
	TimelineSources,
} from '@/features/timeline/types/timeline.types'
export type { ChronicleTimelineProvider } from '@/features/timeline/contracts/timeline-provider.contract'
