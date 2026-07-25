import type { RoutePath } from '@/constants/routes'

export type CommandCenterModuleId =
	'health' | 'documents' | 'timeline' | 'family' | 'ask'

export interface AttentionItem {
	id: string
	title: string
	description: string
	tone: 'warning' | 'attention' | 'info'
	path: RoutePath | string
	module: CommandCenterModuleId
	memberId?: string | null
	memberName?: string | null
}

export interface FamilyMemberSummary {
	memberId: string
	displayName: string
	relationship: string
	avatarUrl: string | null
	healthStatus: string
	healthReportCount: number
	documentCount: number
	expiringDocumentCount: number
	recentActivity: string | null
	lastUpdated: string | null
	lastUpdatedLabel: string
}

export interface UnifiedSearchResult {
	id: string
	title: string
	subtitle: string
	source: CommandCenterModuleId
	sourceLabel: string
	path: string
	score?: number
}

export interface QuickAction {
	id: string
	label: string
	description: string
	path: RoutePath | string
	module: CommandCenterModuleId
}

export interface CommandCenterWidgetDefinition {
	id: string
	label: string
	priority: number
	moduleId?: string
	/** When false the widget is hidden — future modules flip this on via registry. */
	isEnabled: boolean
}

export interface HealthSnapshotSummary {
	status: string
	reportCount: number
	latestReportTitle: string | null
}

export interface CommandCenterBriefing {
	greeting: string
	greetingName: string
	dateLabel: string
	familyName: string
	todaySummary: string
	attentionItems: AttentionItem[]
	memberSummaries: FamilyMemberSummary[]
	healthSnapshot: HealthSnapshotSummary
	insights: import('@/features/health/types').HealthInsight[]
	expiringDocuments: import('@/features/documents/types/document.types').ChronicleDocument[]
	documentCount: number
	timelinePreview: import('@/features/timeline/types/timeline.types').ChronicleTimelineEvent[]
	quickActions: QuickAction[]
	widgets: CommandCenterWidgetDefinition[]
	loading: {
		family: boolean
		health: boolean
		documents: boolean
		timeline: boolean
	}
	hasAnyData: boolean
	isNewUser: boolean
}
