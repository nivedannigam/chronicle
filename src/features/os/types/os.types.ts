import type { RoutePath } from '@/constants/routes'
import type { PlatformModuleId } from '@/core/platform/contracts/platform-module.contract'

export type LifeScoreDimensionId =
	'health' | 'protection' | 'identity' | 'finance' | 'vehicles' | 'property'

export type LifeScoreStatus = 'excellent' | 'good' | 'attention' | 'unknown'

export interface LifeScoreDimension {
	id: LifeScoreDimensionId
	label: string
	/** Numeric score 0–100 when available */
	score: number | null
	/** Human display — e.g. "92", "Excellent", "—" */
	displayValue: string
	status: LifeScoreStatus
	path: RoutePath | string
	enabled: boolean
	color: string
}

export interface LifeScore {
	dimensions: LifeScoreDimension[]
	overallScore: number | null
	overallLabel: string
	headline: string
}

export interface DailyBrief {
	greeting: string
	paragraphs: string[]
	tone: 'calm' | 'attention' | 'welcome'
}

export interface UpcomingItem {
	id: string
	title: string
	description: string
	daysUntil: number | null
	module: PlatformModuleId | 'documents' | 'timeline'
	path: RoutePath | string
	emoji: string
}

export interface LifeFeedItem {
	id: string
	title: string
	subtitle: string
	timestamp: string
	relativeLabel: string
	module:
		| import('@/features/timeline/types/timeline.types').TimelineModule
		| 'timeline'
	path: RoutePath | string
	emoji: string
}

/** @deprecated Use LifeFeedItem */
export type RecentActivityItem = LifeFeedItem

export interface OsQuickAction {
	id: string
	label: string
	emoji: string
	path: RoutePath | string
}

export interface ChronicleOsHome {
	greeting: string
	greetingName: string
	dateLabel: string
	lifeScore: LifeScore
	dailyBrief: DailyBrief
	upcoming: UpcomingItem[]
	lifeFeed: LifeFeedItem[]
	/** @deprecated Use lifeFeed */
	recentActivity: LifeFeedItem[]
	quickActions: OsQuickAction[]
	notificationCount: number
	hasAnyData: boolean
	isNewUser: boolean
}

export type GroupedSearchSectionId =
	'documents' | 'timeline' | 'modules' | 'people' | 'ask'

export interface GroupedSearchResult {
	id: string
	title: string
	subtitle: string
	path: string
	domain: string
	score?: number
}

export interface GroupedSearchSection {
	id: GroupedSearchSectionId
	label: string
	emoji: string
	results: GroupedSearchResult[]
}
