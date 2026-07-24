export interface HomePendingAction {
	id: string
	label: string
	description: string
	path: string
	tone: 'accent' | 'warning' | 'neutral'
}

export interface HomeContinueItem {
	id: string
	title: string
	description: string
	path: string
}

export interface HomeActivityItem {
	id: string
	title: string
	subtitle: string
	timestamp: string
	kind: 'import' | 'extraction' | 'connection' | 'review' | 'family'
}

export interface HomeBriefing {
	greeting: string
	greetingName: string
	dateLabel: string
	aiSummary: string
	aiSummaryTone: 'positive' | 'neutral' | 'attention'
	healthScore: number | null
	importedReportsCount: number
	latestReportTitle: string | null
	latestReportDate: string | null
	continueItem: HomeContinueItem | null
	pendingActions: HomePendingAction[]
	activities: HomeActivityItem[]
	totalActivityCount: number
	isLoading: boolean
	hasHealthData: boolean
}
