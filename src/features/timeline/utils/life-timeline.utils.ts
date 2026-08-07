import type {
	ChronicleTimelineEvent,
	TimelineEventType,
} from '@/features/timeline/types/timeline.types'

export type TimelineEventCategory = 'life' | 'import' | 'operational'

/** Event types that represent Chronicle import/processing — never shown in Life Timeline. */
export const IMPORT_TIMELINE_EVENT_TYPES = new Set<TimelineEventType>([
	'report_imported',
	'document_uploaded',
])

/** Insurance knowledge timeline types excluded from Life Timeline. */
export const INTERNAL_INSURANCE_TIMELINE_TYPES = new Set([
	'document_imported',
	'premium_paid',
])

const OPERATIONAL_EVENT_TYPES = new Set<TimelineEventType>(['connection'])

export function classifyTimelineEventCategory(input: {
	eventType: TimelineEventType
	tags?: string[]
}): TimelineEventCategory {
	if (IMPORT_TIMELINE_EVENT_TYPES.has(input.eventType)) {
		return 'import'
	}

	if (OPERATIONAL_EVENT_TYPES.has(input.eventType)) {
		return 'operational'
	}

	if (
		input.eventType === 'custom' &&
		input.tags?.some((tag) => INTERNAL_INSURANCE_TIMELINE_TYPES.has(tag))
	) {
		return 'import'
	}

	return 'life'
}

export function isLifeTimelineEvent(event: ChronicleTimelineEvent): boolean {
	if (event.category) {
		return event.category === 'life'
	}

	return (
		classifyTimelineEventCategory({
			eventType: event.eventType,
			tags: event.tags,
		}) === 'life'
	)
}

export function filterLifeTimelineEvents(
	events: ChronicleTimelineEvent[],
): ChronicleTimelineEvent[] {
	return events.filter(isLifeTimelineEvent)
}
