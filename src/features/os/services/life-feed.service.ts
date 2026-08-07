import { buildTimelineEvents } from '@/features/timeline/engine/timeline-engine'
import type { LifeFeedItem } from '@/features/os/types/os.types'
import type { TimelineSources } from '@/features/timeline/types/timeline.types'
import {
	formatTimelineRelativeLabel,
	getTimelineModuleEmoji,
	resolveTimelineEventPath,
} from '@/features/timeline/utils/timeline-navigation.utils'

const IMPORTANCE_WEIGHT = { high: 30, medium: 20, low: 10 } as const

function scoreLifeFeedItem(input: {
	importance: keyof typeof IMPORTANCE_WEIGHT
	timestamp: string
}): number {
	const ageDays = Math.max(
		0,
		Math.floor(
			(Date.now() - Date.parse(input.timestamp)) / (1000 * 60 * 60 * 24),
		),
	)
	const recencyBoost = Math.max(0, 45 - ageDays)
	return IMPORTANCE_WEIGHT[input.importance] + recencyBoost
}

export function buildLifeFeed(input: {
	userId: string
	memberId?: string | null
	memberName?: string | null
	sources: TimelineSources
	limit?: number
}): LifeFeedItem[] {
	const { events } = buildTimelineEvents({
		userId: input.userId,
		memberId: input.memberId,
		memberName: input.memberName,
		sources: input.sources,
		filters: { lifeEventsOnly: true },
	})

	return events
		.map((event) => ({
			item: {
				id: event.id,
				title: event.title,
				subtitle: event.summary,
				timestamp: event.timestamp,
				relativeLabel: formatTimelineRelativeLabel(event.timestamp),
				module: event.sourceModule,
				path: resolveTimelineEventPath(event),
				emoji: getTimelineModuleEmoji(event.sourceModule),
			},
			priority: scoreLifeFeedItem({
				importance: event.importance,
				timestamp: event.timestamp,
			}),
		}))
		.sort((left, right) => right.priority - left.priority)
		.slice(0, input.limit ?? 6)
		.map((entry) => entry.item)
}
