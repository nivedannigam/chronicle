export type CorpusCompleteness = 'empty' | 'partial' | 'ready'

export type ReportBadgeStatus =
	'normal' | 'partial' | 'needs_reprocess' | 'review'

export interface CoverageReportSummary {
	id: string
	title: string
	date: string
	lab: string
	classifiedCount: number
	unknownCount: number
	totalMetrics: number
	isDisplayReady: boolean
	needsReprocess: boolean
	badgeStatus: ReportBadgeStatus
}

export interface CoverageFailureGroups {
	download: number
	noMetrics: number
	nonLab: number
	other: number
}

/** Single source of truth for import vs health vs Ask coverage. */
export interface HealthCoverageSnapshot {
	discoveredCount: number
	importedCount: number
	failedCount: number
	processingCount: number
	displayReadyCount: number
	completedCount: number
	reportsNeedingReprocess: string[]
	latestUsableReport: CoverageReportSummary | null
	corpusCompleteness: CorpusCompleteness
	limitations: string[]
	summaryLine: string
	failureGroups: CoverageFailureGroups
}
