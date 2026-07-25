import type {
	ChronicleTimelineEvent,
	TimelineMonthGroup,
} from '@/features/timeline/types/timeline.types'

const MONTH_LABELS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December',
] as const

export function groupTimelineByMonth(
	events: ChronicleTimelineEvent[],
): TimelineMonthGroup[] {
	const groups = new Map<string, TimelineMonthGroup>()

	for (const event of events) {
		const date = new Date(event.timestamp)

		if (Number.isNaN(date.getTime())) {
			continue
		}

		const year = date.getFullYear()
		const month = date.getMonth() + 1
		const key = `${year}-${String(month).padStart(2, '0')}`
		const existing = groups.get(key)

		if (existing) {
			existing.events.push(event)
			continue
		}

		groups.set(key, {
			key,
			label: `${MONTH_LABELS[month - 1]} ${year}`,
			year,
			month,
			events: [event],
		})
	}

	return [...groups.values()].sort((left, right) => {
		if (left.year !== right.year) {
			return right.year - left.year
		}

		return right.month - left.month
	})
}
