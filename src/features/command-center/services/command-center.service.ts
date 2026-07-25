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
			title: 'Abnormal lab result',
			description: getReportDisplayTitle(report),
			tone: 'warning',
			path: healthReportPath(report.id),
			module: 'health',
			memberId: report.family_member_id,
			memberName: member?.displayName ?? null,
		})
	}

	if ((input.importStatus?.needsReviewCount ?? 0) > 0) {
		items.push({
			id: 'import-review',
			title: 'Imports need review',
			description: `${input.importStatus!.needsReviewCount} item${input.importStatus!.needsReviewCount === 1 ? '' : 's'} waiting for review`,
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
				title: `No health reports for ${member.displayName}`,
				description: 'Import lab results to build a health picture',
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

		const score = scoreTextMatch(tokens, body)

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

		const score = scoreTextMatch(tokens, body)

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
		const score = scoreTextMatch(tokens, body)

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
		})
	}

	return results.slice(0, input.limit ?? 8)
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
		attentionItems: buildAttentionItems({
			members: input.members,
			reports: input.reports,
			documents: input.documents,
			importStatus: input.importStatus,
			metricHistories: input.metricHistories,
			accountOwnerMemberId,
		}),
		memberSummaries: input.members.map((member) =>
			buildMemberSummary({
				member,
				reports: input.reports,
				documents: input.documents,
				accountOwnerMemberId,
			}),
		),
		insights: derivedInsights.slice(0, 4),
		expiringDocuments: expiringDocuments.slice(0, 3),
		documentCount: input.documents.length,
		timelinePreview,
		quickActions: getDefaultQuickActions(),
		widgets: getCommandCenterWidgets(),
		loading: input.loading,
		hasAnyData:
			completedReports.length > 0 ||
			input.documents.length > 0 ||
			timelinePreview.length > 0,
	}
}
