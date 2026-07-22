import {
	healthCategories,
	healthDashboard,
	healthReports,
} from '@/features/health/services/mockHealth'
import type { HealthCategoryId, HealthReport } from '@/features/health/types'

export function getHealthDashboard() {
	return healthDashboard
}

export function getHealthCategories() {
	return healthCategories
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
	const { latestReportId } = healthDashboard
	return getHealthReportById(latestReportId)
}

export function getReportsByCategory(
	categoryId: HealthCategoryId,
): HealthReport[] {
	return getHealthReports().filter((report) => report.category === categoryId)
}

export function getCategoryById(categoryId: HealthCategoryId) {
	return healthCategories.find((category) => category.id === categoryId)
}
