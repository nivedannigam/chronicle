export const PRODUCT = {
	name: 'Chronicle',
	tagline:
		'Your family health and documents — organized, searchable, and private.',
	valueProposition:
		'Chronicle brings together health reports and important documents so your family can find answers quickly.',
} as const

export const ONBOARDING_COPY = {
	welcomeTitle: 'Welcome to Chronicle',
	welcomeBody:
		'Chronicle organizes your family health records and important documents in one calm, private place.',
	stepFamilyTitle: 'Start with your family',
	stepFamilyBody:
		'Add family members so health records and documents stay organized by person.',
	stepHealthTitle: 'Connect health records',
	stepHealthBody:
		'Link Google Drive and Chronicle will find lab reports and organize them for you.',
	stepDocumentTitle: 'Add an important document',
	stepDocumentBody:
		'Upload a passport, insurance policy, or any document you want to keep handy.',
	stepAskTitle: 'Ask your first question',
	stepAskBody:
		'Try "What should I pay attention to?" or "Where is my passport?" — Chronicle answers from your records.',
	completeTitle: "You're all set",
	completeBody:
		'Chronicle is ready. Your home page will fill in as you add more records.',
	skip: 'Skip for now',
	continue: 'Continue',
	getStarted: 'Get started',
	done: 'Go to Home',
} as const

export const COMMAND_CENTER_COPY = {
	headline: 'Home',
	todaySummaryLabel: "Today's Summary",
	searchLabel: 'Search Chronicle',
	searchPlaceholder: 'Passport, cholesterol, insurance, vaccination…',
	attentionLabel: 'Needs Your Attention',
	familyLabel: 'Your Family',
	healthSnapshotLabel: 'Health Snapshot',
	recentActivityLabel: 'Recent Activity',
	quickActionsLabel: 'Quick Actions',
	insightsLabel: 'Insights',
	documentsLabel: 'Important Documents',
	timelineLabel: 'Life Timeline',
	viewTimelineLabel: 'View all',
	exploreLabel: 'Explore Chronicle',
	getStartedTitle: 'Get started with Chronicle',
	getStartedBody:
		'Connect health records or upload a document — Chronicle will organize everything for you.',
} as const

export const HOME_COPY = {
	briefLabel: "Today's Summary",
	continueLabel: 'Continue where you left off',
	healthLabel: 'Health Snapshot',
	exploreLabel: 'Explore Chronicle',
	askLabel: 'Ask Chronicle',
	activityLabel: 'Recent Activity',
	timelineLabel: 'Life Timeline',
	viewTimelineLabel: 'View all',
} as const

export const HEALTH_COPY = {
	homeTab: 'Home',
	progressTab: 'Progress',
	historyTab: 'History',
	reportsTab: 'Reports',
	askTab: 'Ask',
	settingsTab: 'Settings',
	emptyStoryTitle: 'Your health story starts here.',
	emptyStoryBody:
		'Your health story will begin after your first report. Connect Google Drive to get started.',
	emptyTitle: 'Your health story starts here.',
	emptyBody:
		'Connect Google Drive and choose a health folder — Chronicle will organize your records for you.',
	connectDrive: 'Connect Google Drive',
	chooseFolder: 'Choose health folder',
	emptyHistoryTitle: 'Your health history will appear here',
	emptyHistoryBody:
		'Checkups and meaningful changes from your reports will show up here over time.',
	emptyProgressTitle: 'Your progress story starts here',
	emptyProgressBody:
		'As reports are added, Chronicle will show how your health is improving over time.',
	emptyReportsTitle: 'Your reports library',
	emptyReportsBody:
		'Every health document you import will appear here — searchable, organized, and ready to review.',
	emptyVisitsTitle: 'No health visits yet',
	emptyVisitsBody:
		'When health records are added, Chronicle will organize them into visits — the way you remember care, not as loose PDFs.',
	/** @deprecated Legacy pages — routes redirect to Home */
	goToSetup: 'Connect health records',
	emptyAddReports: 'Connect Google Drive',
} as const

export const INSURANCE_COPY = {
	homeTab: 'Home',
	protectionTab: 'Protection',
	policiesTab: 'Policies',
	emptyTitle: 'Am I protected?',
	emptyBody:
		'Connect your Insurance folder in Google Drive — Chronicle will understand your policies automatically.',
	connectFolder: 'Connect Insurance folder',
	dropPolicyHint: 'Or drop a policy PDF into Google Drive',
	emptyProtectionTitle: 'Your protection areas will appear here',
	emptyProtectionBody:
		'Connect your Insurance folder and Chronicle will organize cover by life area — health, life, home, and more.',
	emptyPoliciesTitle: 'Your policies will appear here',
	emptyPoliciesBody:
		'Connect your Insurance folder — Chronicle will organize every policy, renewal, and claim automatically.',
	emptyClaimsTitle: 'No claims yet',
	emptyClaimsBody:
		'When you file a claim, Chronicle will organize bills, approvals, and settlements here automatically.',
	viewPolicies: 'View policies',
	claimsTab: 'Claims',
	timelineTab: 'Timeline',
	askTab: 'Ask',
	settingsTab: 'Settings',
	emptyTimelineTitle: 'Your story begins here',
	emptyTimelineBody:
		'As policies renew, vehicles are added, and claims are settled — your insurance journey will come to life.',
} as const

export const ASK_COPY = {
	title: 'Ask Chronicle',
	subtitle:
		'Ask questions about health records and documents you have shared with Chronicle.',
	placeholder: 'What would you like to know?',
	capabilityNotice:
		'I can answer questions using your health records and documents.',
	capabilityNoticeEnhanced:
		"I'm connected to your family's records and ready to help.",
	suggestedHeading: 'Try asking',
	recentHeading: 'Recent',
	evidenceFromRecords: 'From your records',
	viewOriginal: 'View original report',
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
			'Summarize my latest health report.',
			'Explain my HbA1c result.',
			'Show my abnormal health findings.',
			'Compare my last two health reports.',
			'What follow-up tests should I consider?',
		],
	},
	{
		id: 'documents',
		label: 'Documents',
		available: true,
		questions: [
			'Where is my passport?',
			'Explain my passport document.',
			'What documents expire this year?',
		],
	},
	{
		id: 'insurance',
		label: 'Insurance',
		available: true,
		questions: [
			'Am I adequately insured?',
			'Which policy expires next?',
			'Do I have duplicate coverage?',
			'What claims have I made?',
			'How much premium do I pay every year?',
		],
	},
	{
		id: 'travel',
		label: 'Travel',
		available: true,
		questions: ['Help me plan my upcoming trip.', 'When do our visas expire?'],
	},
	{
		id: 'finance',
		label: 'Finance',
		available: true,
		questions: ['Summarize my monthly spending.', 'When is our mortgage due?'],
	},
	{
		id: 'family',
		label: 'Family',
		available: true,
		questions: [
			'Summarize my family health.',
			'What appointments are coming up?',
		],
	},
]

/** @deprecated Use ASK_QUESTION_GROUPS */
export const PLATFORM_ASK_PROMPTS = ASK_QUESTION_GROUPS.flatMap(
	(group) => group.questions,
)
