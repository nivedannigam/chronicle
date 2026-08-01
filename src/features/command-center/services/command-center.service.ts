import { ROUTES, documentPath, healthReportPath } from '@/constants/routes'
import { filterDocumentsForMember } from '@/features/documents/services/document.service'
import { documentsExpiringWithin } from '@/features/documents/services/document.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import {
	filterReportsForMember,
	getAccountOwnerMemberId,
	getGreetingName,
	getTimeOfDayGreeting,
} from '@/features/family/utils/member-display'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import { getReportDisplayTitle } from '@/features/health/services/health-parsed-report.service'
import type {
	HealthInsight,
	UploadedHealthReport,
} from '@/features/health/types'
import type { HealthMetricHistory } from '@/features/health-knowledge/types'
import { buildDerivedInsights } from '@/features/health-knowledge/engines/insights.engine'
import type { HealthImportStatus } from '@/features/health-import/services/health-import-status.service'
import type {
	AttentionItem,
	CommandCenterBriefing,
	FamilyMemberSummary,
	UnifiedSearchResult,
} from '@/features/command-center/types/command-center.types'
import {
	getCommandCenterWidgets,
	getDefaultQuickActions,
} from '@/features/command-center/widgets/widget-registry'
import { buildTimelinePreview } from '@/features/timeline/engine/timeline-engine'
import '@/features/timeline/providers/register-timeline-providers'
import {
	scoreTextMatch,
	tokenizeQuery,
} from '@/features/intelligence/services/semantic-search.service'

function formatRelativeDay(dateIso: string): string {
	const date = new Date(dateIso)
	const now = new Date()
	const diffDays = Math.floor(
		(now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24),
	)

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

function daysUntil(dateIso: string): number {
	const target = new Date(dateIso)
	const now = new Date()
	return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function countAbnormalReports(reports: UploadedHealthReport[]): number {
	return reports.filter((report) => {
		if (report.status !== 'completed') {
			return false
		}

		const parsed = getParsedHealthReport(report)
		return parsed?.metrics.some((metric) =>
			['low', 'high', 'critical'].includes(metric.status),
		)
	}).length
}

function deriveHealthStatus(input: {
	reportCount: number
	abnormalCount: number
	metricHistories: HealthMetricHistory[]
}): string {
	if (input.reportCount === 0) {
		return 'No reports yet'
	}

	const attentionMetrics = input.metricHistories.filter((history) => {
		const latest = history.observations[history.observations.length - 1]
		return (
			latest?.status === 'low' ||
			latest?.status === 'high' ||
			latest?.status === 'critical' ||
			history.trend.direction === 'declining'
		)
	}).length

	if (input.abnormalCount > 0 || attentionMetrics > 0) {
		return 'Needs attention'
	}

	return 'Looking good'
}

function buildMemberSummary(input: {
	member: FamilyMemberWithAliases
	reports: UploadedHealthReport[]
	documents: ChronicleDocument[]
	accountOwnerMemberId: string | null
}): FamilyMemberSummary {
	const memberReports = filterReportsForMember(
		input.reports,
		input.member.id,
		input.accountOwnerMemberId,
	)
	const memberDocuments = filterDocumentsForMember(
		input.documents,
		input.member.id,
		input.accountOwnerMemberId,
	)
	const completedReports = memberReports.filter(
		(report) => report.status === 'completed',
	)
	const expiring = documentsExpiringWithin(memberDocuments, 365)
	const latestReport = [...completedReports].sort(
		(a, b) =>
			Date.parse(b.report_date ?? b.uploaded_at) -
			Date.parse(a.report_date ?? a.uploaded_at),
	)[0]
	const latestDocument = [...memberDocuments].sort(
		(a, b) => Date.parse(b.uploaded_at) - Date.parse(a.uploaded_at),
	)[0]
	const lastUpdated =
		latestReport?.processed_at ??
		latestReport?.uploaded_at ??
		latestDocument?.uploaded_at ??
		null

	let recentActivity: string | null = null

	if (latestReport) {
		recentActivity = `Report: ${getReportDisplayTitle(latestReport)}`
	} else if (latestDocument) {
		recentActivity = `Document: ${latestDocument.title}`
	}

	return {
		memberId: input.member.id,
		displayName: input.member.displayName,
		relationship: input.member.relationship,
		avatarUrl: input.member.avatarUrl,
		healthStatus: deriveHealthStatus({
			reportCount: completedReports.length,
			abnormalCount: countAbnormalReports(completedReports),
			metricHistories: [],
		}),
		healthReportCount: completedReports.length,
		documentCount: memberDocuments.length,
		expiringDocumentCount: expiring.length,
		recentActivity,
		lastUpdated,
		lastUpdatedLabel: lastUpdated ? formatRelativeDay(lastUpdated) : 'Not yet',
	}
}

export function buildAttentionItems(input: {
	members: FamilyMemberWithAliases[]
	reports: UploadedHealthReport[]
	documents: ChronicleDocument[]
	importStatus?: HealthImportStatus
	metricHistories: HealthMetricHistory[]
	accountOwnerMemberId: string | null
}): AttentionItem[] {
	const items: AttentionItem[] = []

	for (const document of documentsExpiringWithin(input.documents, 90)) {
		const days = daysUntil(document.expiry_date!)
		const member = input.members.find(
			(entry) => entry.id === document.family_member_id,
		)

		items.push({
			id: `expiry-${document.id}`,
			title: document.title,
			description:
				days <= 0
					? 'This document has expired'
					: days <= 30
						? `Expires in ${days} day${days === 1 ? '' : 's'}`
						: `Expires in ${Math.ceil(days / 30)} months`,
			tone: days <= 30 ? 'warning' : 'attention',
			path: documentPath(document.id),
			module: 'documents',
			memberId: document.family_member_id,
			memberName: member?.displayName ?? null,
		})
	}

	const abnormalReports = input.reports.filter((report) => {
		if (report.status !== 'completed') {
			return false
		}

		const parsed = getParsedHealthReport(report)
		return parsed?.metrics.some((metric) =>
			['low', 'high', 'critical'].includes(metric.status),
		)
	})

	for (const report of abnormalReports.slice(0, 3)) {
		const member = input.members.find(
			(entry) => entry.id === report.family_member_id,
		)

		items.push({
			id: `abnormal-${report.id}`,
			title: 'Result needs attention',
			description: getReportDisplayTitle(report),
			tone: 'warning',
			path: healthReportPath(report.id),
			module: 'health',
			memberId: report.family_member_id,
			memberName: member?.displayName ?? null,
		})
	}

	if ((input.importStatus?.needsReviewCount ?? 0) > 0) {
		const count = input.importStatus!.needsReviewCount
		items.push({
			id: 'import-review',
			title: 'Reports waiting for your OK',
			description: `${count} report${count === 1 ? '' : 's'} ready to review`,
			tone: 'attention',
			path: ROUTES.healthSettings,
			module: 'health',
		})
	}

	for (const member of input.members) {
		const memberReports = filterReportsForMember(
			input.reports,
			member.id,
			input.accountOwnerMemberId,
		).filter((report) => report.status === 'completed')

		if (memberReports.length === 0) {
			items.push({
				id: `missing-health-${member.id}`,
				title: `No health records for ${member.displayName}`,
				description: 'Connect health records to get started',
				tone: 'info',
				path: ROUTES.healthSettings,
				module: 'health',
				memberId: member.id,
				memberName: member.displayName,
			})
		}
	}

	return items.slice(0, 6)
}

export function buildUnifiedSearchResults(input: {
	query: string
	reports: UploadedHealthReport[]
	documents: ChronicleDocument[]
	userId: string
	limit?: number
}): UnifiedSearchResult[] {
	const normalized = input.query.trim()

	if (!normalized) {
		return []
	}

	const tokens = tokenizeQuery(normalized)
	const results: UnifiedSearchResult[] = []

	for (const report of input.reports) {
		if (report.status !== 'completed') {
			continue
		}

		const parsed = getParsedHealthReport(report)
		const title = getReportDisplayTitle(report)
		const body = [
			title,
			report.file_name,
			parsed?.metadata.laboratory ?? '',
			parsed?.metadata.reportType ?? '',
			parsed?.metrics.map((metric) => metric.displayName).join(' ') ?? '',
		].join(' ')

		const score = boostSearchScore(
			normalized,
			body,
			scoreTextMatch(tokens, body),
		)

		if (score <= 0) {
			continue
		}

		results.push({
			id: `search-report-${report.id}`,
			title,
			subtitle: parsed?.metadata.laboratory ?? 'Health report',
			source: 'health',
			sourceLabel: 'Health',
			path: healthReportPath(report.id),
			score,
		})
	}

	for (const document of input.documents) {
		const body = [
			document.title,
			document.file_name,
			document.document_number ?? '',
			document.category_id,
			document.tags.join(' '),
		].join(' ')

		const score = boostSearchScore(
			normalized,
			body,
			scoreTextMatch(tokens, body),
		)

		if (score <= 0) {
			continue
		}

		results.push({
			id: `search-document-${document.id}`,
			title: document.title,
			subtitle: document.document_number ?? document.category_id,
			source: 'documents',
			sourceLabel: 'Documents',
			path: documentPath(document.id),
			score,
		})
	}

	const timelineEvents = buildTimelinePreview(
		{
			userId: input.userId,
			sources: {
				health: { uploadedReports: input.reports },
				documents: { uploadedDocuments: input.documents },
			},
		},
		20,
	)

	for (const event of timelineEvents) {
		const body = [event.title, event.summary, event.tags.join(' ')].join(' ')
		const score = boostSearchScore(
			normalized,
			body,
			scoreTextMatch(tokens, body),
		)

		if (score <= 0) {
			continue
		}

		results.push({
			id: `search-timeline-${event.id}`,
			title: event.title,
			subtitle: event.summary,
			source: event.sourceModule === 'documents' ? 'documents' : 'health',
			sourceLabel: event.sourceModule === 'documents' ? 'Documents' : 'Health',
			path: ROUTES.timeline,
			score,
		})
	}

	return results
		.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
		.slice(0, input.limit ?? 8)
}

const SEARCH_TOPIC_ALIASES: Record<string, string[]> = {
	liver: ['liver', 'alt', 'ast', 'sgpt', 'sgot', 'bilirubin', 'lft'],
	kidney: ['kidney', 'creatinine', 'egfr', 'urea', 'bun'],
	heart: ['heart', 'cholesterol', 'ldl', 'hdl', 'triglyceride', 'lipid'],
	diabetes: ['diabetes', 'glucose', 'hba1c', 'a1c', 'sugar'],
	passport: ['passport', 'identity', 'visa', 'travel'],
	insurance: ['insurance', 'policy', 'premium', 'coverage'],
}

function boostSearchScore(
	query: string,
	body: string,
	baseScore: number,
): number {
	if (baseScore <= 0) {
		return 0
	}

	const normalizedQuery = query.toLowerCase()

	for (const [topic, aliases] of Object.entries(SEARCH_TOPIC_ALIASES)) {
		if (!aliases.some((alias) => normalizedQuery.includes(alias))) {
			continue
		}

		const bodyLower = body.toLowerCase()

		if (aliases.some((alias) => bodyLower.includes(alias))) {
			return baseScore + 3
		}

		if (bodyLower.includes(topic)) {
			return baseScore + 2
		}
	}

	return baseScore
}

export function buildTodaysSummary(input: {
	attentionCount: number
	reportCount: number
	documentCount: number
	expiringCount: number
	greetingName: string
	hasAnyData: boolean
	familySetupCount?: number
}): string {
	if (!input.hasAnyData) {
		return `${input.greetingName}, welcome to Chronicle. Connect health records or upload a document to get started.`
	}

	if (input.attentionCount > 0) {
		return `${input.greetingName}, you have ${input.attentionCount} item${input.attentionCount === 1 ? '' : 's'} that need${input.attentionCount === 1 ? 's' : ''} your attention today.`
	}

	if ((input.familySetupCount ?? 0) > 0) {
		return `${input.greetingName}, your records look clear. ${input.familySetupCount} family setup item${input.familySetupCount === 1 ? '' : 's'} remain.`
	}

	if (input.expiringCount > 0) {
		return `${input.greetingName}, ${input.expiringCount} document${input.expiringCount === 1 ? '' : 's'} expiring soon — worth a look.`
	}

	if (input.reportCount > 0 && input.documentCount > 0) {
		return `${input.greetingName}, your health records and documents are up to date. Ask Chronicle if you need anything.`
	}

	if (input.reportCount > 0) {
		return `${input.greetingName}, your health records are organized. Open Health to see how you are doing.`
	}

	return `${input.greetingName}, your document library is ready. Search or ask Chronicle to find what you need.`
}

export function buildCommandCenterBriefing(input: {
	userId: string
	profileName?: string
	familyName?: string
	members: FamilyMemberWithAliases[]
	reports: UploadedHealthReport[]
	documents: ChronicleDocument[]
	metricHistories: HealthMetricHistory[]
	importStatus?: HealthImportStatus
	loading: CommandCenterBriefing['loading']
}): CommandCenterBriefing {
	const accountOwnerMemberId = getAccountOwnerMemberId(input.members)
	const completedReports = input.reports.filter(
		(report) => report.status === 'completed',
	)
	const abnormalCount = countAbnormalReports(completedReports)
	const derivedInsights = buildDerivedInsights(
		input.metricHistories,
		abnormalCount,
	).map<HealthInsight>((insight) => ({
		id: insight.id,
		text: insight.text,
		tone: insight.tone,
	}))

	const timelinePreview = buildTimelinePreview({
		userId: input.userId,
		sources: {
			health: {
				uploadedReports: input.reports,
				metricHistories: input.metricHistories,
			},
			documents: { uploadedDocuments: input.documents },
		},
	})

	const expiringDocuments = documentsExpiringWithin(input.documents, 365)
	const attentionItems = buildAttentionItems({
		members: input.members,
		reports: input.reports,
		documents: input.documents,
		importStatus: input.importStatus,
		metricHistories: input.metricHistories,
		accountOwnerMemberId,
	})
	const actionableAttention = attentionItems.filter(
		(item) => item.tone !== 'info',
	)
	const familySetupCount = attentionItems.length - actionableAttention.length
	const hasAnyData =
		completedReports.length > 0 ||
		input.documents.length > 0 ||
		timelinePreview.length > 0
	const latestReport = [...completedReports].sort(
		(a, b) =>
			Date.parse(b.report_date ?? b.uploaded_at) -
			Date.parse(a.report_date ?? a.uploaded_at),
	)[0]

	return {
		greeting: getTimeOfDayGreeting(),
		greetingName: getGreetingName(
			input.profileName,
			input.members[0]?.displayName,
		),
		dateLabel: new Date().toLocaleDateString('en-US', {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
		}),
		familyName: input.familyName ?? 'My Family',
		todaySummary: buildTodaysSummary({
			attentionCount: actionableAttention.length,
			familySetupCount,
			reportCount: completedReports.length,
			documentCount: input.documents.length,
			expiringCount: expiringDocuments.length,
			greetingName: getGreetingName(
				input.profileName,
				input.members[0]?.displayName,
			),
			hasAnyData,
		}),
		attentionItems,
		memberSummaries: input.members.map((member) =>
			buildMemberSummary({
				member,
				reports: input.reports,
				documents: input.documents,
				accountOwnerMemberId,
			}),
		),
		healthSnapshot: {
			status: deriveHealthStatus({
				reportCount: completedReports.length,
				abnormalCount,
				metricHistories: input.metricHistories,
			}),
			reportCount: completedReports.length,
			latestReportTitle: latestReport
				? getReportDisplayTitle(latestReport)
				: null,
		},
		insights: derivedInsights.slice(0, 3),
		expiringDocuments: expiringDocuments.slice(0, 3),
		documentCount: input.documents.length,
		timelinePreview,
		quickActions: getDefaultQuickActions(),
		widgets: getCommandCenterWidgets(),
		loading: input.loading,
		hasAnyData,
		isNewUser: !hasAnyData,
	}
}
