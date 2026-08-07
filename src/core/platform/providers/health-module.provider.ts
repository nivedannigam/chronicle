import { healthReportPath } from '@/constants/routes'
import type {
	ChronicleModuleProvider,
	ModuleDocumentSection,
	ModuleProviderQuery,
	ModuleSummary,
} from '@/core/platform/contracts/module-provider.contract'
import {
	getReportDisplayTitle,
	getParsedHealthReport,
} from '@/features/health/services/health-parsed-report.service'
import type { UploadedHealthReport } from '@/features/health/types'
import type { ChronicleDocumentSummary } from '@/features/documents/types/document-intelligence.types'

function formatDisplayDate(value: string): string {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) {
		return '—'
	}

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function healthReportToSummary(
	report: UploadedHealthReport,
	memberNames: Record<string, string>,
): ChronicleDocumentSummary {
	const parsed = getParsedHealthReport(report)
	const title = getReportDisplayTitle(report)
	const reportDate = report.report_date ?? report.uploaded_at

	return {
		id: report.id,
		title,
		categoryId: 'medical',
		categoryLabel: 'Health',
		subCategoryLabel: parsed?.metadata.reportType ?? report.report_type ?? null,
		ownerLabel: report.family_member_id
			? (memberNames[report.family_member_id] ?? 'Family member')
			: 'Account owner',
		sourceLabel: report.source === 'google_drive' ? 'Google Drive' : 'Upload',
		summary: parsed?.metadata.laboratory
			? `${parsed.metadata.laboratory} · ${formatDisplayDate(reportDate)}`
			: formatDisplayDate(reportDate),
		displayDate: formatDisplayDate(reportDate),
		expiresLabel: null,
		isExpiringSoon: false,
		isExpired: false,
		fileType: 'PDF',
		hasAiSummary: Boolean(parsed?.metrics.length),
		tags: ['health'],
		relatedModules: [
			{
				moduleId: 'health',
				label: 'Health',
				route: healthReportPath(report.id),
			},
		],
		consumerStatus:
			report.status === 'completed' ? 'Ready' : 'Still Organizing',
		aiDiscoveryLabel: null,
		year: new Date(reportDate).getFullYear(),
	}
}

export const healthModuleProvider: ChronicleModuleProvider = {
	moduleId: 'health',
	label: 'Health',
	emoji: '❤️',
	priority: 10,

	getDocumentSection(query: ModuleProviderQuery): ModuleDocumentSection | null {
		const reports = (query.sources.health?.uploadedReports ?? []).filter(
			(report) => report.status === 'completed',
		)

		if (reports.length === 0) {
			return null
		}

		const memberNames = query.memberNames ?? {}
		const documents = reports.map((report) =>
			healthReportToSummary(report, memberNames),
		)

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
		const count = (query.sources.health?.uploadedReports ?? []).filter(
			(report) => report.status === 'completed',
		).length

		if (count === 0) {
			return null
		}

		return {
			moduleId: 'health',
			label: 'Health',
			emoji: '❤️',
			documentCount: count,
			headline: `${count} health report${count === 1 ? '' : 's'}`,
		}
	},
}
