import type { HealthTrendDirection } from '@/features/health-knowledge/types'

export interface ProfileMetricEntry {
	canonicalId: string
	displayName: string
	categoryId: string
	latestValue: string
	unit: string | null
	status: string
	trend: HealthTrendDirection
	trendLabel: string
	observationCount: number
	firstObservedAt: string | null
	lastObservedAt: string | null
	historyYears: number[]
}

export interface LongitudinalHealthProfile {
	personId: string
	generatedAt: string
	reportCount: number
	metrics: ProfileMetricEntry[]
	priorityMetrics: ProfileMetricEntry[]
	otherMetrics: ProfileMetricEntry[]
}

export interface HealthSummary {
	headline: string
	bullets: string[]
	overallStatus: 'stable' | 'improving' | 'needs_attention' | 'mixed'
	metricsNeedingAttention: number
	improvingCount: number
	stableCount: number
	newFindingsCount: number
}

export type ReportTimelineKind =
	| 'annual_checkup'
	| 'blood_test'
	| 'ecg'
	| 'radiology'
	| 'vitamin_test'
	| 'health_summary'
	| 'specialist_visit'
	| 'general'

export interface ClassifiedReport {
	reportId: string
	title: string
	kind: ReportTimelineKind
	displayKind: string
	hospital: string | null
	doctor: string | null
	date: string
}
