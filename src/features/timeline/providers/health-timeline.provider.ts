import {
	getParsedHealthReport,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import type { UploadedHealthReport } from '@/features/health/types'
import type { HealthMetricHistory } from '@/features/health-knowledge/types'
import type {
	ChronicleTimelineProvider,
	TimelineProviderQuery,
} from '@/features/timeline/contracts/timeline-provider.contract'
import { registerTimelineProvider } from '@/features/timeline/registry/timeline-registry'
import type { ChronicleTimelineEvent } from '@/features/timeline/types/timeline.types'
import { buildYearTimeline } from '@/features/semantic-memory/timeline/timeline-engine'

const PROVIDER_ID = 'health'

function getReports(query: TimelineProviderQuery): UploadedHealthReport[] {
	return query.sources.health?.uploadedReports ?? []
}

function getMetricHistories(
	query: TimelineProviderQuery,
): HealthMetricHistory[] {
	return query.sources.health?.metricHistories ?? []
}

function classifyReportEventType(
	reportType: string,
): ChronicleTimelineEvent['eventType'] {
	const normalized = reportType.toLowerCase()

	if (/vaccin|immun/i.test(normalized)) {
		return 'vaccination'
	}

	if (/prescription|medication|medicine|rx/i.test(normalized)) {
		return 'medication'
	}

	if (/procedure|surgery|operation/i.test(normalized)) {
		return 'procedure'
	}

	if (/diagnos|pathology|biopsy/i.test(normalized)) {
		return 'diagnosis'
	}

	return 'lab_result'
}

function buildClinicalTitle(
	report: UploadedHealthReport,
	reportType: string,
	eventType: ChronicleTimelineEvent['eventType'],
): string {
	const displayTitle = getReportDisplayTitle(report)
	const combined = `${displayTitle} ${reportType}`.toLowerCase()

	if (/annual|master|full body|comprehensive|health check/i.test(combined)) {
		return 'Annual Health Checkup'
	}

	switch (eventType) {
		case 'vaccination':
			return 'Vaccination'
		case 'medication':
			return 'Medication Recorded'
		case 'procedure':
			return 'Medical Procedure'
		case 'diagnosis':
			return 'Diagnosis Recorded'
		default:
			return displayTitle || 'Health Checkup'
	}
}

function reportClinicalEvent(
	report: UploadedHealthReport,
): ChronicleTimelineEvent | null {
	if (report.status !== 'completed') {
		return null
	}

	const parsed = getParsedHealthReport(report)

	if (!parsed) {
		return null
	}

	const title = getReportDisplayTitle(report)
	const reportType =
		parsed.metadata.reportType ?? report.report_type ?? 'Lab report'
	const eventType = classifyReportEventType(reportType)
	const metricCount = parsed.metrics.length
	const abnormalCount = parsed.metrics.filter((metric) =>
		['low', 'high', 'critical'].includes(metric.status),
	).length
	const timestamp = report.report_date ?? report.uploaded_at

	return {
		id: `health-clinical-${report.id}`,
		timestamp,
		eventType,
		category: 'life',
		title: buildClinicalTitle(report, reportType, eventType),
		summary:
			metricCount > 0
				? `${metricCount} result${metricCount === 1 ? '' : 's'} from ${parsed.metadata.laboratory}`
				: `${reportType} from ${parsed.metadata.laboratory}`,
		familyMemberId: report.family_member_id ?? null,
		sourceModule: 'health',
		relatedAssets: [
			{
				type: 'report',
				id: report.id,
				label: title,
			},
		],
		tags: ['health', reportType.toLowerCase()],
		importance: abnormalCount > 0 ? 'high' : 'medium',
		references: [
			{
				type: 'report',
				id: report.id,
				label: title,
			},
		],
		metadata: {
			lab: parsed.metadata.laboratory,
			reportType,
			metricCount: String(metricCount),
			abnormalCount: String(abnormalCount),
		},
	}
}

function semanticTimelineEvents(
	histories: HealthMetricHistory[],
): ChronicleTimelineEvent[] {
	const groups = buildYearTimeline(histories)
	const events: ChronicleTimelineEvent[] = []

	for (const group of groups) {
		for (const event of group.events) {
			const eventType =
				event.kind === 'improvement'
					? 'improvement'
					: event.kind === 'resolution'
						? 'improvement'
						: event.kind === 'finding'
							? 'finding'
							: 'lab_result'

			events.push({
				id: `health-semantic-${event.id}`,
				timestamp: event.date,
				eventType,
				category: 'life',
				title:
					event.kind === 'improvement' || event.kind === 'resolution'
						? 'Health marker improved'
						: event.kind === 'finding'
							? 'Important health finding'
							: 'Health trend noted',
				summary: event.label,
				familyMemberId: null,
				sourceModule: 'health',
				relatedAssets: event.reportId
					? [
							{
								type: 'report',
								id: event.reportId,
								label: event.reportTitle ?? 'Health report',
							},
						]
					: [],
				tags: ['health', event.kind, event.categoryId ?? 'general'],
				importance:
					event.kind === 'finding'
						? 'high'
						: event.kind === 'improvement'
							? 'medium'
							: 'low',
				references: event.reportId
					? [
							{
								type: 'report',
								id: event.reportId,
								label: event.reportTitle ?? 'Health report',
							},
						]
					: [],
				metadata: {
					metricId: event.metricId ?? '',
					categoryId: event.categoryId ?? '',
					evidence: event.evidence ?? '',
				},
			})
		}
	}

	return events
}

export class HealthTimelineProvider implements ChronicleTimelineProvider {
	readonly id = PROVIDER_ID
	readonly module = 'health' as const
	readonly label = 'Health'
	readonly priority = 10

	supports(query: TimelineProviderQuery): boolean {
		return getReports(query).length > 0 || getMetricHistories(query).length > 0
	}

	getEvents(query: TimelineProviderQuery): ChronicleTimelineEvent[] {
		const events: ChronicleTimelineEvent[] = []

		for (const report of getReports(query)) {
			const clinical = reportClinicalEvent(report)

			if (clinical) {
				events.push(clinical)
			}
		}

		events.push(...semanticTimelineEvents(getMetricHistories(query)))

		return events
	}
}

export const healthTimelineProvider = new HealthTimelineProvider()

registerTimelineProvider(healthTimelineProvider)
