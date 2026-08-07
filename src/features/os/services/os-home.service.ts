import { ROUTES } from '@/constants/routes'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { CommandCenterBriefing } from '@/features/command-center/types/command-center.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { HealthMetricHistory } from '@/features/health-knowledge/types'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import { buildDailyBrief } from '@/features/os/services/daily-brief.service'
import { buildLifeFeed } from '@/features/os/services/life-feed.service'
import { buildLifeScore } from '@/features/os/services/life-score.service'
import { buildUpcomingItems } from '@/features/os/services/upcoming.service'
import type {
	ChronicleOsHome,
	OsQuickAction,
} from '@/features/os/types/os.types'
import type { TimelineSources } from '@/features/timeline/types/timeline.types'

const DEFAULT_QUICK_ACTIONS: OsQuickAction[] = [
	{ id: 'ask', label: 'Ask Chronicle', emoji: '✨', path: ROUTES.ask },
	{ id: 'search', label: 'Search', emoji: '🔍', path: ROUTES.search },
	{ id: 'library', label: 'Open Library', emoji: '📚', path: ROUTES.documents },
]

export function buildChronicleOsHome(input: {
	userId: string
	briefing: CommandCenterBriefing
	metricHistories: HealthMetricHistory[]
	insuranceKnowledge: InsuranceKnowledge | null
	documents: ChronicleDocument[]
	reports: UploadedHealthReport[]
	members: FamilyMemberWithAliases[]
	notificationCount: number
}): ChronicleOsHome {
	const lifeScore = buildLifeScore({
		metricHistories: input.metricHistories,
		insuranceKnowledge: input.insuranceKnowledge,
		documents: input.documents,
	})

	const dailyBrief = buildDailyBrief({
		greetingName: input.briefing.greetingName,
		hasAnyData: input.briefing.hasAnyData,
		lifeScore,
		attentionItems: input.briefing.attentionItems,
		insuranceKnowledge: input.insuranceKnowledge,
		expiringDocumentCount: input.briefing.expiringDocuments.length,
		healthReportCount: input.briefing.healthSnapshot.reportCount,
	})

	const upcoming = buildUpcomingItems({
		documents: input.documents,
		insuranceKnowledge: input.insuranceKnowledge,
		reports: input.reports,
		members: input.members,
	})

	const timelineSources: TimelineSources = {
		health: {
			uploadedReports: input.reports,
			metricHistories: input.metricHistories,
		},
		documents: {
			uploadedDocuments: input.documents,
		},
		insurance: {
			knowledge: input.insuranceKnowledge ?? undefined,
		},
	}

	const lifeFeed = buildLifeFeed({
		userId: input.userId,
		sources: timelineSources,
		limit: 6,
	})

	return {
		greeting: dailyBrief.greeting,
		greetingName: input.briefing.greetingName,
		dateLabel: input.briefing.dateLabel,
		lifeScore,
		dailyBrief,
		upcoming,
		lifeFeed,
		recentActivity: lifeFeed,
		quickActions: DEFAULT_QUICK_ACTIONS,
		notificationCount: input.notificationCount,
		hasAnyData: input.briefing.hasAnyData,
		isNewUser: input.briefing.isNewUser,
	}
}
