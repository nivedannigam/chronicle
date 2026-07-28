import { ASK_QUESTION_GROUPS } from '@/constants/product-copy'
import type { AskSessionMeta } from '@/features/ask/services/ask-session.service'
import { listAskSessions } from '@/features/ask/services/ask-session.service'
import {
	buildDynamicSuggestionChips,
	type DynamicSuggestionChip,
} from '@/features/ask/services/dynamic-suggestions.service'
import { buildDocumentsHubView } from '@/features/documents/services/document-intelligence.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
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
	quickActions: AskQuickAction[]
	recentInsights: AskHomeInsight[]
}

function timeGreeting(): string {
	const hour = new Date().getHours()

	if (hour < 12) return 'Good morning'
	if (hour < 17) return 'Good afternoon'
	return 'Good evening'
}

function firstName(input: string | null | undefined): string | null {
	if (!input?.trim()) return null
	return input.trim().split(/\s+/)[0] ?? null
}

export function buildAskHomeView(input: {
	userId: string
	userName?: string | null
	selectedMember?: FamilyMemberWithAliases | null
	members: FamilyMemberWithAliases[]
	uploadedReports: UploadedHealthReport[]
	documents: ChronicleDocument[]
}): AskHomeView {
	const memberFirst = firstName(input.selectedMember?.displayName)
	const accountFirst = firstName(input.userName)
	const name = memberFirst ?? accountFirst

	const greeting = name ? `${timeGreeting()}, ${name}.` : `${timeGreeting()}.`

	const subGreeting = memberFirst
		? `Ask anything about ${memberFirst}'s health, documents, or family context.`
		: 'Your personal assistant across health, documents, and family.'

	const suggestedQuestions = buildDynamicSuggestionChips({
		uploadedReports: input.uploadedReports,
		documents: input.documents,
		memberName: input.selectedMember?.displayName ?? null,
		members: input.members,
	})

	const recentSessions = listAskSessions(input.userId).slice(0, 5)

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
		groupedSuggestions: ASK_QUESTION_GROUPS.map((group) => ({
			id: group.id,
			label: group.label,
			available: group.available,
			questions: [...group.questions],
		})),
		recentSessions,
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
