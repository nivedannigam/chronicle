import {
	getHealthReports,
	getLatestHealthReport,
	getReportComparisons,
	getTrendSeries,
	getTrendSeriesById,
	getReportsByCategory,
	getHealthReportById,
	getUpcomingActions,
	getHealthSnapshots,
} from '@/features/health/services/health.service'
import { searchKnowledge as searchKnowledgeItems } from '@/features/knowledge/services/knowledge.service'
import type { KnowledgeQueryService } from '@/features/ask/services/knowledge-query.interface'
import type {
	MetricSearchResult,
	ReportComparisonResult,
	ReportSearchCriteria,
	ReportSummaryResult,
} from '@/features/ask/types'
import type {
	HealthCategoryId,
	HealthReport,
	MetricStatus,
} from '@/features/health/types'

const CATEGORY_KEYWORDS: Record<string, HealthCategoryId> = {
	liver: 'liver',
	heart: 'heart',
	kidney: 'kidney',
	diabetes: 'diabetes',
	thyroid: 'thyroid',
	vitamin: 'vitamin',
	blood: 'blood-count',
	cholesterol: 'heart',
	lipid: 'heart',
	cardiac: 'heart',
}

function normalizeMetricQuery(query: string): string {
	return query.trim().toLowerCase()
}

function metricMatches(metricName: string, search: string): boolean {
	const normalizedName = metricName.toLowerCase()
	const normalizedSearch = normalizeMetricQuery(search)

	return (
		normalizedName.includes(normalizedSearch) ||
		normalizedSearch.includes(normalizedName) ||
		(normalizedSearch.includes('vitamin d') &&
			normalizedName.includes('vitamin d')) ||
		(normalizedSearch.includes('b12') && normalizedName.includes('b12')) ||
		(normalizedSearch.includes('hba1c') && normalizedName.includes('hba1c')) ||
		(normalizedSearch.includes('cholesterol') &&
			normalizedName.includes('cholesterol'))
	)
}

function isAbnormalStatus(status: MetricStatus): boolean {
	return status === 'low' || status === 'high' || status === 'critical'
}

function resolveCategoryFromCriteria(
	criteria: ReportSearchCriteria,
): HealthCategoryId | undefined {
	if (criteria.category) {
		return criteria.category as HealthCategoryId
	}

	if (criteria.metricName) {
		const search = normalizeMetricQuery(criteria.metricName)

		if (
			search.includes('liver') ||
			search.includes('alt') ||
			search.includes('ast')
		) {
			return 'liver'
		}

		if (search.includes('vitamin')) {
			return 'vitamin'
		}

		if (search.includes('cholesterol') || search.includes('ldl')) {
			return 'heart'
		}
	}

	return undefined
}

export class MockKnowledgeQueryService implements KnowledgeQueryService {
	searchKnowledge(userId: string, query: string) {
		const knowledgeResult = searchKnowledgeItems({ userId, query, limit: 8 })
		const healthReports = getHealthReports().filter(
			(report) =>
				report.title.toLowerCase().includes(query.toLowerCase()) ||
				report.summary.toLowerCase().includes(query.toLowerCase()) ||
				report.lab.toLowerCase().includes(query.toLowerCase()),
		)

		return {
			...knowledgeResult,
			items: [
				...knowledgeResult.items,
				...healthReports.map((report) => ({
					id: report.id,
					userId,
					type: 'HealthReport' as const,
					title: report.title,
					summary: report.summary,
					source: 'health' as const,
					sourceId: report.id,
					tags: ['health', report.category],
					confidence: 0.92,
					createdAt: report.date,
					updatedAt: report.date,
					metadata: { lab: report.lab, displayDate: report.displayDate },
				})),
			].slice(0, 8),
		}
	}

	findReports(_userId: string, criteria: ReportSearchCriteria): HealthReport[] {
		let reports = getHealthReports()
		const category = resolveCategoryFromCriteria(criteria)

		if (category) {
			reports = getReportsByCategory(category)
		}

		if (criteria.metricName) {
			reports = reports.filter((report) =>
				report.metrics.some((metric) =>
					metricMatches(metric.name, criteria.metricName!),
				),
			)
		}

		if (criteria.abnormalOnly) {
			reports = reports.filter((report) =>
				report.metrics.some((metric) => isAbnormalStatus(metric.status)),
			)
		}

		if (criteria.limit) {
			reports = reports.slice(0, criteria.limit)
		}

		return reports
	}

	findMetrics(_userId: string, metricName: string): MetricSearchResult[] {
		const results: MetricSearchResult[] = []

		for (const report of getHealthReports()) {
			for (const metric of report.metrics) {
				if (!metricMatches(metric.name, metricName)) {
					continue
				}

				results.push({
					metricName: metric.name,
					value: metric.value,
					reference: metric.reference,
					status: metric.status,
					reportId: report.id,
					reportTitle: report.title,
					reportDate: report.displayDate,
				})
			}
		}

		return results
	}

	compareReports(
		_userId: string,
		olderReportId?: string,
		newerReportId?: string,
	): ReportComparisonResult | null {
		const comparisons = getReportComparisons()

		if (olderReportId && newerReportId) {
			const match = comparisons.find(
				(comparison) =>
					comparison.olderReportId === olderReportId &&
					comparison.newerReportId === newerReportId,
			)

			if (match) {
				return {
					label: match.label,
					olderLabel: match.olderLabel,
					newerLabel: match.newerLabel,
					metrics: match.metrics,
				}
			}
		}

		const fallback = comparisons[0]

		if (!fallback) {
			return null
		}

		return {
			label: fallback.label,
			olderLabel: fallback.olderLabel,
			newerLabel: fallback.newerLabel,
			metrics: fallback.metrics,
		}
	}

	summarizeReport(
		_userId: string,
		reportId?: string,
	): ReportSummaryResult | null {
		const report = reportId
			? getHealthReportById(reportId)
			: getLatestHealthReport()

		if (!report) {
			return null
		}

		return {
			reportId: report.id,
			title: report.title,
			date: report.displayDate,
			lab: report.lab,
			summary: report.summary,
			metrics: report.metrics.map((metric) => ({
				name: metric.name,
				value: metric.value,
				status: metric.status,
			})),
		}
	}

	getTrendForMetric(metricName: string) {
		const normalized = normalizeMetricQuery(metricName)

		if (normalized.includes('vitamin d')) {
			return getTrendSeriesById('vitamin-d')
		}

		if (normalized.includes('b12')) {
			return getTrendSeriesById('b12')
		}

		if (normalized.includes('hba1c') || normalized.includes('glucose')) {
			return getTrendSeriesById('hba1c')
		}

		if (normalized.includes('cholesterol')) {
			return getTrendSeriesById('cholesterol')
		}

		return undefined
	}

	getSnapshots() {
		return getHealthSnapshots()
	}

	getAllTrends() {
		return getTrendSeries()
	}

	getUpcomingActions() {
		return getUpcomingActions()
	}

	resolveCategory(question: string): HealthCategoryId | undefined {
		const lower = question.toLowerCase()

		for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
			if (lower.includes(keyword)) {
				return category
			}
		}

		return undefined
	}
}

export const mockKnowledgeQueryService = new MockKnowledgeQueryService()
