export interface TimelineEventRecord {
	id: string
	year: number
	date: string
	label: string
	kind: string
	metricId?: string
	categoryId?: string
	status?: string
	reportId?: string
	reportTitle?: string
	evidence?: string
}

export interface YearTimelineGroup {
	year: number
	events: TimelineEventRecord[]
}

export interface MetricHistoryRecord {
	canonicalId: string
	displayName: string
	categoryId: string
	unit: string | null
	latestValue: string
	previousValue: string | null
	trend: string
	trendDirection: string
	highest: string | null
	lowest: string | null
	average: string | null
	latestStatus: string
	previousStatus: string | null
	latestObservedAt: string
	previousObservedAt: string | null
	dataPointCount: number
	changePercent: string | null
	linkedReportIds: string[]
}
