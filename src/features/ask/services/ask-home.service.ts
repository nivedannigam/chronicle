import {
	BETA_ASK_QUESTION_GROUPS,
	BETA_EXPERIENCES,
} from '@/features/ask/beta/beta-experiences'
import {
	listAskSessions,
	listAskSessionsForHome,
	type AskSessionMeta,
} from '@/features/ask/services/ask-session.service'
import {
	buildDynamicSuggestionChips,
	type DynamicSuggestionChip,
} from '@/features/ask/services/dynamic-suggestions.service'
import { buildDocumentsHubView } from '@/features/documents/services/document-intelligence.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import { resolveMemberDisplayName } from '@/features/family/utils/member-display'
import { isReportDisplayReady } from '@/features/health/services/report-readiness.service'
import type { UploadedHealthReport } from '@/features/health/types'

export interface AskHomeInsight {
	id: string
	title: string
	detail: string
	domain: 'health' | 'documents' | 'family'
	severity: 'info' | 'attention'
}

export interface AskQuickAction {
	id: string
	label: string
	description: string
	route: string
	color: string
}

export interface AskHomeView {
	greeting: string
	subGreeting: string
	suggestedQuestions: DynamicSuggestionChip[]
	groupedSuggestions: Array<{
		id: string
		label: string
		available: boolean
		questions: string[]
	}>
	recentSessions: AskSessionMeta[]
	totalSessionCount: number
	showClearHistoryHint: boolean
	quickActions: AskQuickAction[]
	recentInsights: AskHomeInsight[]
}

function timeGreeting(): string {
	const hour = new Date().getHours()

	if (hour < 12) return 'Good morning'
	if (hour < 17) return 'Good afternoon'
	return 'Good evening'
}

export function buildAskHomeView(input: {
	userId: string
	userName?: string | null
	selectedMember?: FamilyMemberWithAliases | null
	members: FamilyMemberWithAliases[]
	uploadedReports: UploadedHealthReport[]
	documents: ChronicleDocument[]
}): AskHomeView {
	const displayName = resolveMemberDisplayName({
		profileName: input.userName,
		memberDisplayName: input.selectedMember?.displayName,
		isAccountOwner: input.selectedMember?.isAccountOwner,
	})

	const greeting = `${timeGreeting()}, ${displayName}.`

	const subGreeting =
		displayName !== 'there'
			? `Ask anything about ${displayName}'s health, documents, or family context.`
			: 'Your personal assistant across health, documents, and family.'

	const suggestedQuestions = [
		...BETA_EXPERIENCES.slice(0, 4).map((experience) => ({
			id: experience.id,
			label: experience.title,
			question: experience.canonicalQuestion,
			category:
				experience.domain === 'health' || experience.domain === 'documents'
					? experience.domain
					: ('general' as const),
		})),
		...buildDynamicSuggestionChips({
			uploadedReports: input.uploadedReports,
			documents: input.documents,
			memberName: displayName,
			members: input.members,
		}),
	].slice(0, 8)

	const recentSessions = listAskSessionsForHome(input.userId)
	const totalSessionCount = listAskSessions(input.userId).length
	const displayReadyCount =
		input.uploadedReports.filter(isReportDisplayReady).length
	const showClearHistoryHint =
		displayReadyCount === 0 &&
		listAskSessions(input.userId).some((session) => session.turnCount > 0)

	const documentsHub = buildDocumentsHubView({
		documents: input.documents,
		memberNames: Object.fromEntries(
			input.members.map((member) => [member.id, member.displayName]),
		),
	})

	const recentInsights: AskHomeInsight[] = []

	for (const item of documentsHub.attention
		.filter((entry) => entry.severity !== 'low')
		.slice(0, 2)) {
		recentInsights.push({
			id: `doc-${item.id}`,
			title: item.title,
			detail: item.detail,
			domain: 'documents',
			severity: item.severity === 'high' ? 'attention' : 'info',
		})
	}

	const completedReports = input.uploadedReports.filter(
		(report) => report.status === 'completed',
	)

	if (completedReports.length > 0) {
		recentInsights.push({
			id: 'health-latest',
			title: 'Latest health report available',
			detail: `${completedReports.length} report${completedReports.length === 1 ? '' : 's'} ready to summarize or compare.`,
			domain: 'health',
			severity: 'info',
		})
	}

	if (input.members.length > 1) {
		recentInsights.push({
			id: 'family-context',
			title: `${input.members.length} family members in context`,
			detail: 'Ask about anyone by name — no need to switch modules.',
			domain: 'family',
			severity: 'info',
		})
	}

	return {
		greeting,
		subGreeting,
		suggestedQuestions,
		groupedSuggestions: BETA_ASK_QUESTION_GROUPS.map((group) => ({
			id: group.id,
			label: group.label,
			available: group.available,
			questions: [...group.questions],
		})),
		recentSessions,
		totalSessionCount,
		showClearHistoryHint,
		quickActions: [
			{
				id: 'search',
				label: 'Search',
				description: 'Find reports, documents, people',
				route: '/search',
				color: '#6366f1',
			},
			{
				id: 'health',
				label: 'Health',
				description: 'Reports & metrics',
				route: '/health',
				color: '#22c55e',
			},
			{
				id: 'documents',
				label: 'Documents',
				description: 'Identity, insurance, property',
				route: '/documents',
				color: '#3b82f6',
			},
		],
		recentInsights: recentInsights.slice(0, 4),
	}
}
