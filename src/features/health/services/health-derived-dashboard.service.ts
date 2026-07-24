import { C } from '@/constants/colors'
import type {
	HealthInsight,
	HealthSnapshot,
	UploadedHealthReport,
} from '@/features/health/types'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import type { HealthMetric as DomainHealthMetric } from '@/features/document-intelligence/domain/metric.types'

const SNAPSHOT_CATALOG: Array<{
	id: string
	emoji: string
	name: string
	color: string
	categories: string[]
}> = [
	{
		id: 'heart',
		emoji: '❤️',
		name: 'Heart',
		color: C.red,
		categories: ['heart'],
	},
	{
		id: 'liver',
		emoji: '🫀',
		name: 'Liver',
		color: C.orange,
		categories: ['liver'],
	},
	{
		id: 'blood',
		emoji: '🩸',
		name: 'Blood',
		color: C.photos,
		categories: ['blood-count'],
	},
	{
		id: 'diabetes',
		emoji: '💉',
		name: 'Diabetes',
		color: C.yellow,
		categories: ['diabetes'],
	},
	{
		id: 'vitamins',
		emoji: '🦴',
		name: 'Vitamins',
		color: C.greenAlt,
		categories: ['vitamin'],
	},
	{
		id: 'kidney',
		emoji: '🧪',
		name: 'Kidney',
		color: C.teal,
		categories: ['kidney'],
	},
	{
		id: 'thyroid',
		emoji: '🦋',
		name: 'Thyroid',
		color: C.accentBlue,
		categories: ['thyroid'],
	},
]

function formatDisplayDate(value: string | null | undefined): string {
	if (!value) {
		return '—'
	}

	return new Date(value).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function summarizeStatus(metrics: DomainHealthMetric[]): string {
	const abnormal = metrics.find(
		(metric) =>
			metric.status === 'low' ||
			metric.status === 'high' ||
			metric.status === 'critical' ||
			metric.status === 'borderline',
	)

	if (!abnormal) {
		return 'Normal'
	}

	return `${abnormal.displayName} ${abnormal.status}`
}

function trendFromMetrics(
	metrics: DomainHealthMetric[],
): HealthSnapshot['trend'] {
	if (
		metrics.some(
			(metric) => metric.status === 'critical' || metric.status === 'high',
		)
	) {
		return 'attention'
	}

	if (
		metrics.some(
			(metric) => metric.status === 'low' || metric.status === 'borderline',
		)
	) {
		return 'declining'
	}

	return 'stable'
}

export function buildSnapshotsFromUploadedReports(
	uploadedReports: UploadedHealthReport[],
): HealthSnapshot[] {
	const completed = uploadedReports.filter(
		(report) => report.status === 'completed',
	)

	return SNAPSHOT_CATALOG.map((item) => {
		const matchingReports = completed
			.filter((report) => item.categories.includes(report.report_type))
			.sort(
				(a, b) =>
					new Date(b.report_date ?? b.uploaded_at).getTime() -
					new Date(a.report_date ?? a.uploaded_at).getTime(),
			)

		const latest = matchingReports[0]
		const parsed = latest ? getParsedHealthReport(latest) : null
		const metrics = parsed?.metrics ?? []

		return {
			id: item.id,
			emoji: item.emoji,
			name: item.name,
			status: metrics.length > 0 ? summarizeStatus(metrics) : 'No recent data',
			trend: metrics.length > 0 ? trendFromMetrics(metrics) : 'stable',
			latestResultDate: formatDisplayDate(
				latest?.report_date ?? latest?.processed_at ?? null,
			),
			color: item.color,
		}
	})
}

export function buildInsightsFromUploadedReports(
	uploadedReports: UploadedHealthReport[],
): HealthInsight[] {
	const insights: HealthInsight[] = []

	for (const report of uploadedReports.filter(
		(item) => item.status === 'completed',
	)) {
		const parsed = getParsedHealthReport(report)

		if (!parsed) {
			continue
		}

		for (const metric of parsed.metrics) {
			if (metric.status === 'normal' || metric.status === 'unknown') {
				continue
			}

			insights.push({
				id: `insight-${report.id}-${metric.canonicalId}`,
				text: `${metric.displayName} is ${metric.status} in your ${parsed.metadata.laboratory} report (${formatDisplayDate(parsed.metadata.reportDate)}).`,
				tone:
					metric.status === 'critical' || metric.status === 'high'
						? 'warning'
						: metric.status === 'low' || metric.status === 'borderline'
							? 'warning'
							: 'neutral',
			})
		}
	}

	return insights.slice(0, 6)
}

export function getLatestExtractedReport(
	uploadedReports: UploadedHealthReport[],
) {
	return uploadedReports
		.filter((report) => report.status === 'completed' && report.parsed_data)
		.sort(
			(a, b) =>
				new Date(b.processed_at ?? b.uploaded_at).getTime() -
				new Date(a.processed_at ?? a.uploaded_at).getTime(),
		)[0]
}
