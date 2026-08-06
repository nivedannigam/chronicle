/** Domain-agnostic Progress view model — Health is the first implementation. */

export interface ProgressOverall {
	score: number | null
	deltaLabel: string | null
	sparkline: number[]
	summary: string
	statusLabel?: string
	trendLabel?: string
}

export interface ProgressDomainCard {
	id: string
	name: string
	emoji: string
	color: string
	statusLabel: string
	trendLabel: string
	lastUpdated: string | null
	sparkline: number[]
	hasData: boolean
	categoryId?: string
}

export interface ProgressHighlight {
	id: string
	label: string
	tone: 'positive' | 'neutral' | 'watch'
}

export interface ProgressWatchItem {
	id: string
	label: string
}

export interface ProgressMilestone {
	id: string
	title: string
	date: string
	displayDate: string
	kind: string
}

export interface ProgressAchievement {
	id: string
	title: string
	emoji: string
}

export interface ProgressViewModel {
	overall: ProgressOverall
	domains: ProgressDomainCard[]
	improvements: ProgressHighlight[]
	watchItems: ProgressWatchItem[]
	milestones: ProgressMilestone[]
	achievements: ProgressAchievement[]
	hasEnoughHistory: boolean
}
