import type { AskRecentItem } from '@/types'

export const ASK_COPY = {
	title: 'Ask Chronicle',
	subtitleEmphasis: 'life',
	subtitleBefore: 'Your ',
	subtitleAfter: ', one question away.',
	placeholder: 'Ask about your docs, emails, money, trips...',
} as const

export const askPrompts = [
	'Passport location',
	"Today's emails",
	'Plan Japan trip',
	'Tax documents',
	'Active subscriptions',
] as const

export const askRecents: AskRecentItem[] = [
	{
		q: 'Where is my passport?',
		when: 'Yesterday',
		answer:
			'Passport No. J8847234 · expires Aug 2028 · in Documents → Identity.',
	},
	{ q: 'Total spending this month?', when: '2 days ago', answer: '' },
	{ q: "Summarize Priya's emails", when: '3 days ago', answer: '' },
]
