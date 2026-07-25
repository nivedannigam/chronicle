export type {
	ChroniclePersonalPreferences,
	CommunicationStyle,
	ConversationContext,
	DashboardLayout,
	DisplayFormat,
	NotificationPreferences,
	PersonalContext,
	UnitPreference,
	UsageSignal,
} from '@/features/personalization/types/personal-context.types'
export { DEFAULT_PERSONAL_PREFERENCES } from '@/features/personalization/types/personal-context.types'

export {
	loadLocalPersonalPreferences,
	mergePersonalPreferences,
	parsePersonalPreferences,
	personalPreferencesToRecord,
	saveLocalPersonalPreferences,
} from '@/features/personalization/services/personal-preferences.service'

export {
	assertMemberScopedUserId,
	buildConversationContext,
	buildPersonalContext,
	buildPersonalContextSessionKey,
} from '@/features/personalization/services/personal-context.engine'

export {
	adaptAnswerForStyle,
	shouldIncludeAnswerCards,
	stylePromptInstructions,
} from '@/features/personalization/services/response-adapter.service'

export {
	buildPersonalizedQuestionGroups,
	buildPersonalizedSuggestions,
} from '@/features/personalization/services/personalized-suggestions.service'

export {
	filterUsageSignalsForUser,
	getFrequentTopicsForMember,
	getFrequentlyAccessedReportIds,
	getUsageSignals,
	recordUsageSignal,
} from '@/features/personalization/services/usage-tracker.service'

export {
	clearConversationSession,
	hydrateConversationMemoryFromStorage,
} from '@/features/personalization/services/conversation-session.service'
