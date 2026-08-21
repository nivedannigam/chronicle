import { healthReportPath } from '@/constants/routes'
import type {
	ChronicleModuleProvider,
	ModuleDocumentSection,
	ModuleProviderQuery,
	ModuleSummary,
} from '@/core/platform/contracts/module-provider.contract'
import {
	buildLibraryStableKey,
	formatLibraryDisplayDate,
	matchesLibraryMember,
	resolveOwnerLabel,
	toModuleLibrarySummary,
} from '@/core/platform/providers/module-document-provider.utils'
import { toDocumentSummary } from '@/features/documents/services/document-intelligence.service'
import {
	getReportDisplayTitle,
	getParsedHealthReport,
} from '@/features/health/services/health-parsed-report.service'
import { mapProductReportStatus } from '@/features/health/services/health-product.mapper'
import type { UploadedHealthReport } from '@/features/health/types'
import type { ChronicleDocumentSummary } from '@/features/documents/types/document-intelligence.types'

function isLibraryHealthReport(report: UploadedHealthReport): boolean {
	return report.status !== 'failed'
}

function mapHealthReportConsumerStatus(
	report: UploadedHealthReport,
): ChronicleDocumentSummary['consumerStatus'] {
	switch (mapProductReportStatus(report)) {
		case 'ready':
			return 'Ready'
		case 'organizing':
			return 'Still Organizing'
		default:
			return 'Needs Help'
	}
}

function healthReportToSummary(
	report: UploadedHealthReport,
	memberNames: Record<string, string>,
): ChronicleDocumentSummary {
	const parsed = getParsedHealthReport(report)
	const title = getReportDisplayTitle(report)
	const reportDate = report.report_date ?? report.uploaded_at

	return toModuleLibrarySummary({
		canonicalId: report.id,
		moduleId: 'health',
		categoryId: 'medical',
		categoryLabel: 'Health',
		title,
		documentType: parsed?.metadata.reportType ?? report.report_type ?? null,
		sourceLabel: report.source === 'google_drive' ? 'Google Drive' : 'Upload',
		displayDate: formatLibraryDisplayDate(reportDate),
		summary: parsed?.metadata.laboratory
			? `${parsed.metadata.laboratory} · ${formatLibraryDisplayDate(reportDate)}`
			: formatLibraryDisplayDate(reportDate),
		familyMemberId: report.family_member_id,
		ownerLabel: resolveOwnerLabel(memberNames, report.family_member_id),
		moduleDetailPath: healthReportPath(report.id),
		moduleDetailLabel: 'View health record',
		sourceKey: buildLibraryStableKey('health', report.id),
		hasAiSummary: Boolean(parsed?.metrics.length),
		tags: ['health'],
		consumerStatus: mapHealthReportConsumerStatus(report),
		year: resolveLibraryYear(reportDate),
	})
}

function resolveLibraryYear(value: string): number | null {
	const parsed = Date.parse(value)
	return Number.isNaN(parsed) ? null : new Date(parsed).getFullYear()
}

export const healthModuleProvider: ChronicleModuleProvider = {
	moduleId: 'health',
	label: 'Health',
	emoji: '❤️',
	priority: 10,

	getDocumentSection(query: ModuleProviderQuery): ModuleDocumentSection | null {
		const memberNames = query.memberNames ?? {}
		const scope = {
			memberId: query.memberId,
			accountOwnerMemberId: query.accountOwnerMemberId,
		}
		const documents: ChronicleDocumentSummary[] = []
		const seen = new Set<string>()

		for (const report of query.sources.health?.uploadedReports ?? []) {
			if (!isLibraryHealthReport(report)) {
				continue
			}

			if (!matchesLibraryMember(report.family_member_id, scope)) {
				continue
			}

			const summary = healthReportToSummary(report, memberNames)
			const key = summary.sourceKey ?? summary.id

			if (seen.has(key)) {
				continue
			}

			seen.add(key)
			documents.push(summary)
		}

		for (const document of query.sources.documents?.uploadedDocuments ?? []) {
			if (document.category_id !== 'medical' || document.status === 'failed') {
				continue
			}

			if (!matchesLibraryMember(document.family_member_id, scope)) {
				continue
			}

			const key = buildLibraryStableKey('health', document.id)

			if (seen.has(key)) {
				continue
			}

			seen.add(key)
			documents.push(toDocumentSummary(document, memberNames))
		}

		if (documents.length === 0) {
			return null
		}

		return {
			moduleId: 'health',
			label: 'Health',
			emoji: '❤️',
			totalCount: documents.length,
			categories: [
				{ id: 'medical', label: 'Health Reports', count: documents.length },
			],
			documents,
		}
	},

	getSummary(query: ModuleProviderQuery): ModuleSummary | null {
		const section = this.getDocumentSection(query)

		if (!section) {
			return null
		}

		return {
			moduleId: 'health',
			label: 'Health',
			emoji: '❤️',
			documentCount: section.totalCount,
			headline: `${section.totalCount} health report${section.totalCount === 1 ? '' : 's'}`,
		}
	},
}
