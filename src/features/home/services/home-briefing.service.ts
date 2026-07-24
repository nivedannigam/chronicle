import { ROUTES } from '@/constants/routes'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import {
	getGreetingName,
	getTimeOfDayGreeting,
} from '@/features/family/utils/member-display'
import { getReportDisplayTitle } from '@/features/health/services/health-parsed-report.service'
import type {
	HealthInsight,
	UploadedHealthReport,
} from '@/features/health/types'
import type { HealthImportStatus } from '@/features/health-import/services/health-import-status.service'
import type {
	HomeActivityItem,
	HomeBriefing,
	HomeContinueItem,
	HomePendingAction,
} from '@/features/home/types/home.types'

const HOME_ACTIVITY_PREVIEW = 3

function formatRelativeDay(dateIso: string): string {
	const date = new Date(dateIso)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

	if (diffDays === 0) {
		return 'Today'
	}

	if (diffDays === 1) {
		return 'Yesterday'
	}

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
	})
}

function buildAiSummary(input: {
	familyName: string
	memberCount: number
	insights: HealthInsight[]
	needsReview: number
	failedImports: number
	driveConnected: boolean
	hasReports: boolean
	latestReportDate: string | null
	healthScore: number | null
}): { text: string; tone: HomeBriefing['aiSummaryTone'] } {
	const hasUrgentHealth =
		input.needsReview > 0 || input.failedImports > 0 || !input.driveConnected

	if (!input.driveConnected) {
		return {
			text: 'Connect Google Drive to bring your records into Chronicle.',
			tone: 'attention',
		}
	}

	if (input.needsReview > 0) {
		return {
			text:
				input.needsReview === 1
					? 'One item needs your review before it joins your timeline.'
					: `${input.needsReview} items need your review.`,
			tone: 'attention',
		}
	}

	if (input.failedImports > 0) {
		return {
			text:
				input.failedImports === 1
					? 'One import did not finish — it needs a moment of attention.'
					: `${input.failedImports} imports need attention.`,
			tone: 'attention',
		}
	}

	if (!hasUrgentHealth && input.memberCount > 1) {
		return {
			text: `A calm day for ${input.familyName}. Nothing urgent needs your attention.`,
			tone: 'positive',
		}
	}

	if (!input.hasReports) {
		return {
			text: 'Nothing urgent today. Chronicle is ready when you are.',
			tone: 'neutral',
		}
	}

	if (input.insights.length > 0) {
		return {
			text: input.insights[0]!.text,
			tone:
				input.insights[0]!.tone === 'warning'
					? 'attention'
					: input.insights[0]!.tone === 'positive'
						? 'positive'
						: 'neutral',
		}
	}

	if (input.latestReportDate) {
		const relative = formatRelativeDay(input.latestReportDate)
		return {
			text:
				relative === 'Today'
					? 'Something new was added to your timeline today.'
					: relative === 'Yesterday'
						? 'Something new was added to your timeline yesterday.'
						: `Your timeline was updated ${relative.toLowerCase()}.`,
			tone: 'neutral',
		}
	}

	if (input.healthScore !== null && input.healthScore >= 85) {
		return {
			text: 'Everything looks steady today.',
			tone: 'positive',
		}
	}

	return {
		text: 'You are caught up for now.',
		tone: 'neutral',
	}
}

function buildPendingActions(input: {
	needsReview: number
	failedImports: number
	driveConnected: boolean
	importCandidates: number
}): HomePendingAction[] {
	const actions: HomePendingAction[] = []

	if (!input.driveConnected) {
		actions.push({
			id: 'connect-drive',
			label: 'Connect Google Drive',
			description: 'Link your Drive to import family records.',
			path: ROUTES.settingsConnectorsDrive,
			tone: 'warning',
		})
	}

	if (input.needsReview > 0) {
		actions.push({
			id: 'review-imports',
			label: 'Review imported reports',
			description: `${input.needsReview} report${input.needsReview === 1 ? '' : 's'} waiting for approval.`,
			path: ROUTES.healthImportReview,
			tone: 'accent',
		})
	}

	if (input.failedImports > 0) {
		actions.push({
			id: 'failed-ocr',
			label: 'Complete processing',
			description: `${input.failedImports} report${input.failedImports === 1 ? '' : 's'} failed during extraction.`,
			path: ROUTES.healthReports,
			tone: 'warning',
		})
	}

	if (input.importCandidates > 0 && input.needsReview === 0) {
		actions.push({
			id: 'import-pending',
			label: 'Finish import',
			description: 'Approved reports are ready to import.',
			path: ROUTES.healthSettings,
			tone: 'accent',
		})
	}

	return actions
}

function buildContinueItem(input: {
	pendingActions: HomePendingAction[]
	hasReports: boolean
	latestReportTitle: string | null
}): HomeContinueItem | null {
	if (input.pendingActions[0]) {
		const action = input.pendingActions[0]
		return {
			id: action.id,
			title: action.label,
			description: action.description,
			path: action.path,
		}
	}

	if (input.hasReports && input.latestReportTitle) {
		return {
			id: 'latest-report',
			title: 'Pick up your latest report',
			description: input.latestReportTitle,
			path: ROUTES.healthReports,
		}
	}

	return {
		id: 'explore-ask',
		title: 'Ask Chronicle',
		description: 'Search what you have shared — starting with Health today.',
		path: ROUTES.ask,
	}
}

function buildActivities(
	reports: UploadedHealthReport[],
	importStatus: HealthImportStatus | undefined,
): HomeActivityItem[] {
	const items: HomeActivityItem[] = []

	for (const report of reports) {
		if (report.status !== 'completed') {
			continue
		}

		const timestamp = report.processed_at ?? report.uploaded_at

		items.push({
			id: `import-${report.id}`,
			title: 'Report added to timeline',
			subtitle: getReportDisplayTitle(report),
			timestamp,
			kind: 'import',
		})
	}

	if (importStatus?.lastScanAt) {
		items.push({
			id: 'scan',
			title: 'Google Drive scanned',
			subtitle: `${importStatus.medicalReportsCount} medical files discovered`,
			timestamp: importStatus.lastScanAt,
			kind: 'connection',
		})
	}

	return items.sort(
		(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
	)
}

export function buildHomeBriefing(input: {
	profileName?: string
	selectedMemberName?: string
	familyName?: string
	members: FamilyMemberWithAliases[]
	insights: HealthInsight[]
	healthScore: number | null
	reports: UploadedHealthReport[]
	importStatus?: HealthImportStatus
	driveConnected: boolean
	isLoading: boolean
}): HomeBriefing {
	const completed = input.reports.filter(
		(report) => report.status === 'completed',
	)
	const latest = [...completed].sort(
		(a, b) =>
			Date.parse(b.report_date ?? b.uploaded_at) -
			Date.parse(a.report_date ?? a.uploaded_at),
	)[0]
	const needsReview = input.importStatus?.needsReviewCount ?? 0
	const failedImports = input.importStatus?.failedImportsCount ?? 0
	const importCandidates = input.importStatus?.importCandidatesCount ?? 0
	const familyName = input.familyName ?? 'My Family'

	const ai = buildAiSummary({
		familyName,
		memberCount: input.members.length,
		insights: input.insights,
		needsReview,
		failedImports,
		driveConnected: input.driveConnected,
		hasReports: completed.length > 0,
		latestReportDate: latest?.processed_at ?? latest?.uploaded_at ?? null,
		healthScore: input.healthScore,
	})

	const pendingActions = buildPendingActions({
		needsReview,
		failedImports,
		driveConnected: input.driveConnected,
		importCandidates,
	})

	const allActivities = buildActivities(input.reports, input.importStatus)

	const continueItem = buildContinueItem({
		pendingActions,
		hasReports: completed.length > 0,
		latestReportTitle: latest ? getReportDisplayTitle(latest) : null,
	})

	return {
		greeting: getTimeOfDayGreeting(),
		greetingName: getGreetingName(input.profileName, input.selectedMemberName),
		dateLabel: new Date().toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
		}),
		aiSummary: ai.text,
		aiSummaryTone: ai.tone,
		healthScore: input.healthScore,
		importedReportsCount: completed.length,
		latestReportTitle: latest ? getReportDisplayTitle(latest) : null,
		latestReportDate: latest
			? formatRelativeDay(latest.processed_at ?? latest.uploaded_at)
			: null,
		continueItem,
		pendingActions,
		activities: allActivities.slice(0, HOME_ACTIVITY_PREVIEW),
		totalActivityCount: allActivities.length,
		isLoading: input.isLoading,
		hasHealthData: completed.length > 0,
	}
}

export function buildAllHomeActivities(
	reports: UploadedHealthReport[],
	importStatus?: HealthImportStatus,
): HomeActivityItem[] {
	return buildActivities(reports, importStatus)
}
