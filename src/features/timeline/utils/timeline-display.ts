import { C } from '@/constants/colors'
import type {
	ChronicleTimelineEvent,
	TimelineModule,
} from '@/features/timeline/types/timeline.types'

const MODULE_COLORS: Record<TimelineModule, string> = {
	health: C.teal,
	insurance: C.accentBlue,
	documents: C.accent,
	finance: C.greenAlt,
	travel: C.orange,
	family: C.accentBlue,
	system: C.textMuted,
}

export function getTimelineModuleColor(module: TimelineModule): string {
	return MODULE_COLORS[module]
}
export function formatTimelineTimestamp(timestamp: string): string {
	const date = new Date(timestamp)

	if (Number.isNaN(date.getTime())) {
		return '—'
	}

	const now = new Date()
	const isToday = date.toDateString() === now.toDateString()

	if (isToday) {
		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
		})
	}

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
	})
}

export function formatTimelineModuleLabel(module: TimelineModule): string {
	return module.charAt(0).toUpperCase() + module.slice(1)
}

export function getTimelineImportanceColor(
	importance: ChronicleTimelineEvent['importance'],
): string {
	switch (importance) {
		case 'high':
			return C.orange
		case 'medium':
			return C.accentBlue
		default:
			return C.textMuted
	}
}
