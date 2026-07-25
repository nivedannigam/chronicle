import type { IntelligenceMemberContext } from '@/features/intelligence/types/intelligence.types'

export type CommunicationStyle = 'simple' | 'detailed' | 'clinical'
export type UnitPreference = 'metric' | 'imperial'
export type DisplayFormat = 'summary' | 'detailed'
export type DashboardLayout = 'compact' | 'expanded'

export interface NotificationPreferences {
	healthAlerts: boolean
	importComplete: boolean
}

/** Long-lived user preferences stored in member_preferences.preferences JSONB + local cache. */
export interface ChroniclePersonalPreferences {
	language: string
	units: UnitPreference
	communicationStyle: CommunicationStyle
	displayFormat: DisplayFormat
	dashboardLayout: DashboardLayout
	notificationPreferences: NotificationPreferences
	frequentlyAccessedReportIds: string[]
	frequentTopics: string[]
}

export const DEFAULT_PERSONAL_PREFERENCES: ChroniclePersonalPreferences = {
	language: 'en',
	units: 'metric',
	communicationStyle: 'detailed',
	displayFormat: 'detailed',
	dashboardLayout: 'expanded',
	notificationPreferences: {
		healthAlerts: true,
		importComplete: true,
	},
	frequentlyAccessedReportIds: [],
	frequentTopics: [],
}

/** Short-term session context derived from conversation memory. */
export interface ConversationContext {
	lastIntent?: string
	lastMetricName?: string
	lastCategoryId?: string
	lastReportId?: string
	lastTimeRangeYears?: number
	lastMemberId?: string | null
	lastMemberName?: string | null
	lastQuestion?: string
	turnCount: number
}

/** Full personalization envelope passed into intelligence + Ask. */
export interface PersonalContext {
	userId: string
	activeMember: IntelligenceMemberContext
	preferences: ChroniclePersonalPreferences
	conversation: ConversationContext
	/** True when the question explicitly names a different family member. */
	isExplicitMemberQuery: boolean
}

export interface UsageSignal {
	userId: string
	memberId: string | null
	type: 'ask_question' | 'view_report' | 'follow_up'
	topic?: string
	reportId?: string
	timestamp: string
}
