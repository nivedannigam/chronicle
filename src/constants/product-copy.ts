export const PRODUCT = {
	name: 'Chronicle',
	tagline: "Your family's personal operating system.",
} as const

export const COMMAND_CENTER_COPY = {
	headline: 'Family Command Center',
	searchLabel: 'Search Chronicle',
	searchPlaceholder: 'Passport, HbA1c, insurance, vaccination…',
	attentionLabel: 'Attention Needed',
	familyLabel: 'Your Family',
	quickActionsLabel: 'Quick Actions',
	insightsLabel: 'AI Insights',
	documentsLabel: 'Important Documents',
	timelineLabel: 'Life Timeline',
	viewTimelineLabel: 'View Timeline',
} as const

export const HOME_COPY = {
	briefLabel: "Today's Brief",
	continueLabel: 'Continue where you left off',
	healthLabel: 'Health Snapshot',
	exploreLabel: 'Explore Chronicle',
	askLabel: 'Ask Chronicle',
	activityLabel: 'Recent Activity',
	timelineLabel: 'Life Timeline',
	viewTimelineLabel: 'View Timeline',
} as const

export const ASK_COPY = {
	title: 'Ask Chronicle',
	subtitle:
		"Everything you've entrusted to Chronicle — understood and ready to explore.",
	placeholder: 'What would you like to know?',
	capabilityNotice:
		"Today I can answer questions using your Health records. As you enable more Chronicle capabilities, I'll understand those too.",
	capabilityNoticeEnhanced:
		"I'm connected to your family's Health records and ready to help.",
	suggestedHeading: 'Try asking',
	recentHeading: 'Recent',
} as const

export type AskCapabilityId =
	'health' | 'documents' | 'insurance' | 'travel' | 'finance' | 'family'

export interface AskQuestionGroup {
	id: AskCapabilityId
	label: string
	available: boolean
	questions: readonly string[]
}

export const ASK_QUESTION_GROUPS: AskQuestionGroup[] = [
	{
		id: 'health',
		label: 'Health',
		available: true,
		questions: [
			'What should I pay attention to?',
			'What changed since my last report?',
			'Summarize my health.',
			'What should I discuss with my doctor?',
		],
	},
	{
		id: 'documents',
		label: 'Documents',
		available: true,
		questions: [
			'Where is my passport?',
			'Find my latest tax return.',
			'What documents expire this year?',
		],
	},
	{
		id: 'insurance',
		label: 'Insurance',
		available: false,
		questions: ['Show my insurance policies.', 'When does our policy renew?'],
	},
	{
		id: 'travel',
		label: 'Travel',
		available: false,
		questions: ['Plan my next vacation.', 'When do our visas expire?'],
	},
	{
		id: 'finance',
		label: 'Finance',
		available: false,
		questions: ['Summarize our monthly spending.', 'When is our mortgage due?'],
	},
	{
		id: 'family',
		label: 'Family',
		available: false,
		questions: [
			"When is Advika's vaccination?",
			'What appointments are coming up?',
		],
	},
]

/** @deprecated Use ASK_QUESTION_GROUPS */
export const PLATFORM_ASK_PROMPTS = ASK_QUESTION_GROUPS.flatMap(
	(group) => group.questions,
)
