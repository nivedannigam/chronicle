export {
	buildLongitudinalHealthProfile,
	PRIORITY_METRIC_IDS,
} from '@/features/health-intelligence/services/health-profile.service'
export {
	classifyReportType,
	timelineSummaryForReport,
	REPORT_KIND_LABELS,
} from '@/features/health-intelligence/services/report-type.classifier'
export { buildHealthSummary } from '@/features/health-intelligence/services/health-summary.service'
export { generateLongTermTrendInsights } from '@/features/health-intelligence/engines/long-term-trend.engine'
export type {
	LongitudinalHealthProfile,
	ProfileMetricEntry,
	HealthSummary,
	ClassifiedReport,
	ReportTimelineKind,
} from '@/features/health-intelligence/types/health-profile.types'
