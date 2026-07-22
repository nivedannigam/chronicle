import { C } from '@/constants/colors'
import {
	healthDashboard,
	healthInsights,
	healthReports,
	healthSnapshots,
	healthUploadTimeline,
	reportComparisons,
	trendSeries,
	upcomingActions,
} from '@/features/health/services/mockHealth'
import type { HealthCategoryId, HealthReport } from '@/features/health/types'

const CATEGORY_FALLBACK: Record<
	HealthCategoryId,
	{ name: string; color: string }
> = {
	heart: { name: 'Heart', color: C.red },
	liver: { name: 'Liver', color: C.orange },
	kidney: { name: 'Kidney', color: C.teal },
	diabetes: { name: 'Diabetes', color: C.yellow },
	thyroid: { name: 'Thyroid', color: C.accentBlue },
	vitamin: { name: 'Vitamins', color: C.greenAlt },
	'blood-count': { name: 'Blood', color: C.photos },
	general: { name: 'General', color: C.accent },
}

export function getHealthDashboard() {
	return healthDashboard
}

export function getHealthSnapshots() {
	return healthSnapshots
}

export function getHealthInsights() {
	return healthInsights
}

export function getUpcomingActions() {
	return upcomingActions
}

export function getHealthUploadTimeline() {
	return healthUploadTimeline
}

export function getTrendSeries() {
	return trendSeries
}

export function getReportComparisons() {
	return reportComparisons
}

export function getCategoryById(categoryId: HealthCategoryId) {
	return CATEGORY_FALLBACK[categoryId]
}

export function getHealthReports() {
	return [...healthReports].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	)
}

export function getHealthReportById(
	reportId: string,
): HealthReport | undefined {
	return healthReports.find((report) => report.id === reportId)
}

export function getLatestHealthReport(): HealthReport | undefined {
	return getHealthReportById(healthDashboard.latestReportId)
}

export function getReportsByCategory(
	categoryId: HealthCategoryId,
): HealthReport[] {
	return getHealthReports().filter((report) => report.category === categoryId)
}

export function getReportComparisonById(comparisonId: string) {
	return reportComparisons.find((comparison) => comparison.id === comparisonId)
}

export function getTrendSeriesById(seriesId: string) {
	return trendSeries.find((series) => series.id === seriesId)
}
