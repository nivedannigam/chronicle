import { C } from '@/constants/colors'
import type { TaskItem } from '@/types'

export const TASKS_COPY = {
	title: 'Tasks',
	aiFoundLabel: 'AI found 3',
	progressLabel: '1/8 done',
	aiFoundEmails: 'AI found 3 new in emails',
} as const

export const TASKS_PROGRESS = {
	pct: 13,
	doneCount: 1,
	totalCount: 8,
} as const

export const pendingTasks: TaskItem[] = [
	{
		title: "Review Priya's Series A pitch deck",
		date: 'Jul 21',
		source: "from Priya's email",
		tags: [{ label: 'Work', color: C.accentBlue, bg: `${C.accentBlue}18` }],
		sq: C.accentBlue,
		dot: C.red,
		urgent: true,
	},
	{
		title: 'Submit Q2 expense report',
		date: '',
		source: 'from Finance · Zerodha',
		tags: [
			{ label: 'Overdue', color: C.red, bg: `${C.red}22` },
			{ label: 'Finance', color: C.orange, bg: `${C.orange}18` },
		],
		sq: C.red,
		dot: C.red,
		urgent: true,
	},
	{
		title: 'Book Paris travel insurance',
		date: 'Jul 25',
		source: 'from Airbnb confirmation',
		tags: [{ label: 'Travel', color: C.teal, bg: `${C.teal}18` }],
		sq: C.teal,
		dot: C.yellow,
		urgent: false,
	},
	{
		title: "Reply to Rohan's proposal",
		date: 'Jul 22',
		source: "from Rohan's email",
		tags: [{ label: 'Work', color: C.accentBlue, bg: `${C.accentBlue}18` }],
		sq: C.accentBlue,
		dot: C.red,
		urgent: true,
	},
	{
		title: 'Upload Form 16 to CA portal',
		date: 'Jul 31',
		source: 'from Tax docs',
		tags: [{ label: 'Tax', color: C.orange, bg: `${C.orange}18` }],
		sq: C.red,
		dot: C.orange,
		urgent: false,
	},
	{
		title: 'Renew passport before Nov',
		date: 'Oct 31',
		source: 'from Documents · Identity',
		tags: [{ label: 'Documents', color: C.accent, bg: C.accentDim }],
		sq: C.accent,
		dot: C.yellow,
		urgent: false,
	},
	{
		title: 'Pay HDFC credit card',
		date: 'Jul 21',
		source: 'from HDFC Bank email',
		tags: [{ label: 'Finance', color: C.orange, bg: `${C.orange}18` }],
		sq: C.red,
		dot: C.red,
		urgent: true,
	},
]

export const doneTasks: TaskItem[] = [
	{
		title: 'Book Air India flight to Tokyo',
		date: 'Jul 18',
		source: 'from Air India email',
		tags: [{ label: 'Travel', color: C.teal, bg: `${C.teal}18` }],
		sq: C.teal,
		dot: C.greenAlt,
		urgent: false,
	},
]
