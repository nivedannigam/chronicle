import { C } from '@/constants/colors'
import type { TimelineItem } from '@/types'

export const homeTimeline: TimelineItem[] = [
	{ time: '9:00 AM', event: 'Team standup · 30 min', color: C.accentBlue },
	{
		time: '11:30 AM',
		event: 'Reply to Priya re: Series A',
		color: C.red,
	},
	{ time: '5:00 PM', event: 'HDFC payment reminder', color: C.orange },
	{ time: 'Aug 14', event: 'Paris trip begins · CDG', color: C.green },
]
