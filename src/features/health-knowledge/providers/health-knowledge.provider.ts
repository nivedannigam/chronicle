import { resolveMemberDisplayName } from '@/features/family/utils/member-display'
import {
	buildCoverageReportSummary,
	buildHealthCoverageSnapshot,
} from '@/features/health/services/health-coverage.service'
import { countProcessingReports } from '@/features/health/services/report-readiness.service'
import {
	getParsedHealthReport,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import { buildHealthKnowledgeGraph } from '@/features/health-knowledge/services/health-knowledge-builder'
import {
	buildKnowledgeConfidence,
	deriveMetricConfidence,
	extractReportConfidences,
	metricFromStored,
} from '@/features/health-knowledge/engines/confidence.model'
import {
	partitionRankedMetrics,
	rankHealthMetrics,
	type RankableMetricInput,
} from '@/features/health-knowledge/engines/evidence-ranking.engine'
import {
	buildKnowledgeInsights,
	buildKnowledgeRecommendations,
	buildTrendAnalysis,
} from '@/features/health-knowledge/engines/insights.builder'
import { buildKnowledgeLimitations } from '@/features/health-knowledge/engines/limitations.builder'
import {
	buildDeterministicSummary,
	buildKnowledgeTimeline,
} from '@/features/health-knowledge/engines/knowledge-summary.builder'
import { logHealthKnowledgeBuild } from '@/features/health-knowledge/observability/knowledge-observability'
import {
	defaultHealthKnowledgeDataSource,
	filterRawDataForMember,
	type HealthKnowledgeDataSource,
	type HealthKnowledgeRawData,
} from '@/features/health-knowledge/providers/health-knowledge-data-source'
import type {
	HealthKnowledge,
	HealthKnowledgeFamilyMember,
	HealthKnowledgeGetInput,
	HealthKnowledgeMetric,
	HealthKnowledgeReportRef,
	HealthKnowledgeSource,
} from '@/features/health-knowledge/types/health-knowledge-object.types'
import type { MetricCategoryId } from '@/features/health-knowledge/types/health-knowledge.types'
import { resolveMetricCategoryId } from '@/features/health-knowledge/utils/metric-category-resolver'
import type { StoredHealthMetric } from '@/features/health/types/health-metric-record.types'
import type { UploadedHealthReport } from '@/features/health/types'

function mapReportRef(report: UploadedHealthReport): HealthKnowledgeReportRef {
	const summary = buildCoverageReportSummary(report)
	const parsed = getParsedHealthReport(report)
	const confidences = extractReportConfidences(report)

	return {
		id: report.id,
		title: summary.title,
		date: summary.date,
		lab: summary.lab,
		status: report.status,
		metricCount: summary.totalMetrics,
		classifiedCount: summary.classifiedCount,
		unknownCount: summary.unknownCount,
		isDisplayReady: summary.isDisplayReady,
		needsReprocess: summary.needsReprocess,
		badgeStatus: summary.badgeStatus,
		reportType: parsed?.metadata.reportType ?? report.report_type ?? null,
		parserConfidence: confidences.parserConfidence,
		ocrConfidence: confidences.ocrConfidence,
	}
}

function buildRankableMetrics(input: {
	reports: UploadedHealthReport[]
	storedMetrics: StoredHealthMetric[]
}): RankableMetricInput[] {
	const reportById = new Map(input.reports.map((report) => [report.id, report]))
	const rankable: RankableMetricInput[] = []
	const seen = new Set<string>()

	for (const stored of input.storedMetrics) {
		const key = `${stored.report_id}:${stored.canonical_metric_id}`
		seen.add(key)
		const report = reportById.get(stored.report_id)
		const meta = metricFromStored(stored)

		rankable.push({
			id: stored.id,
			canonicalId: stored.canonical_metric_id,
			displayName: stored.display_name,
			value: stored.value,
			unit: stored.unit,
			status: stored.status,
			categoryId: resolveMetricCategoryId({
				canonicalId: stored.canonical_metric_id,
				displayName: stored.display_name,
				fallbackCategoryId: stored.category as MetricCategoryId,
			}),
			observedAt: stored.observed_at,
			reportId: stored.report_id,
			reportTitle: report ? getReportDisplayTitle(report) : 'Health Report',
			referenceRange: stored.reference_range_raw ?? '',
			source: meta.source,
			confidence: meta.confidence,
			validationStatus: meta.validationStatus,
		})
	}

	for (const report of input.reports.filter(
		(item) => item.status === 'completed',
	)) {
		const parsed = getParsedHealthReport(report)

		if (!parsed) {
			continue
		}

		for (const [index, metric] of (parsed.metrics ?? []).entries()) {
			const canonicalId =
				metric.canonicalId ??
				`raw:${metric.rawName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
			const key = `${report.id}:${canonicalId}`

			if (seen.has(key)) {
				continue
			}

			seen.add(key)
			const meta = deriveMetricConfidence({
				status: metric.status,
				confidence: metric.confidence ?? 0.7,
				source: 'parser',
			})

			rankable.push({
				id: `${report.id}-${canonicalId}-${index}`,
				canonicalId,
				displayName: metric.displayName,
				value: metric.value,
				unit: metric.unit,
				status: metric.status,
				categoryId: resolveMetricCategoryId({
					canonicalId,
					displayName: metric.displayName,
				}),
				observedAt:
					parsed.metadata.reportDate ??
					report.report_date ??
					report.processed_at ??
					report.uploaded_at,
				reportId: report.id,
				reportTitle: getReportDisplayTitle(report),
				referenceRange: metric.referenceRange?.rawText ?? '',
				source: meta.source,
				confidence: metric.confidence ?? 0.7,
				validationStatus: meta.validationStatus,
			})
		}
	}

	return rankable
}

function computeHealthScore(metrics: HealthKnowledgeMetric[]): number | null {
	const classified = metrics.filter((metric) => metric.status !== 'unknown')

	if (classified.length < 5) {
		return null
	}

	const normalCount = classified.filter(
		(metric) => metric.status === 'normal',
	).length

	return Math.round((normalCount / classified.length) * 100)
}

function resolveFamilyMember(
	raw: HealthKnowledgeRawData,
	input: HealthKnowledgeGetInput,
): HealthKnowledgeFamilyMember {
	const member =
		input.familyMemberId != null
			? raw.familyMembers.find((item) => item.id === input.familyMemberId)
			: raw.familyMembers.find((item) => item.isAccountOwner)

	return {
		id: member?.id ?? input.familyMemberId ?? null,
		displayName: member
			? resolveMemberDisplayName({
					memberDisplayName: member.displayName,
					isAccountOwner: member.isAccountOwner,
				})
			: 'Account owner',
		relationship: member?.relationship ?? 'self',
		isAccountOwner: member?.isAccountOwner ?? true,
		dateOfBirth: member?.dateOfBirth ?? null,
		gender: member?.gender ?? null,
	}
}

function buildSources(input: {
	reports: HealthKnowledgeReportRef[]
	metrics: HealthKnowledgeMetric[]
}): HealthKnowledgeSource[] {
	const sources: HealthKnowledgeSource[] = []

	for (const report of input.reports.slice(0, 12)) {
		sources.push({
			type: 'health_report',
			id: report.id,
			label: report.title,
			date: report.date,
		})
	}

	for (const metric of input.metrics.slice(0, 24)) {
		sources.push({
			type: 'health_metric',
			id: metric.id,
			label: metric.displayName,
			date: metric.observedAt,
		})
	}

	return sources
}

function sortReports(
	reports: HealthKnowledgeReportRef[],
): HealthKnowledgeReportRef[] {
	return [...reports].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	)
}

/**
 * Production health knowledge provider.
 * Owns all retrieval, joins, ranking, and assembly for the Health domain.
 */
export class HealthKnowledgeProvider {
	private readonly dataSource: HealthKnowledgeDataSource

	constructor(
		dataSource: HealthKnowledgeDataSource = defaultHealthKnowledgeDataSource,
	) {
		this.dataSource = dataSource
	}

	async getKnowledge(input: HealthKnowledgeGetInput): Promise<HealthKnowledge> {
		const started = performance.now()
		const raw = await this.dataSource.fetchRawData(input)
		const knowledge = this.buildFromRawData(raw, input, started)
		return knowledge
	}

	buildFromRawData(
		raw: HealthKnowledgeRawData,
		input: HealthKnowledgeGetInput,
		startedAt = performance.now(),
	): HealthKnowledge {
		const { reports: memberReports, metrics: memberMetrics } =
			filterRawDataForMember(raw, input)

		const coverage = buildHealthCoverageSnapshot({
			uploadedReports: memberReports,
			importRegistry: raw.importRegistry,
			storedMetrics: memberMetrics,
			memberId: input.familyMemberId,
			accountOwnerMemberId: input.accountOwnerMemberId,
		})

		const graph = buildHealthKnowledgeGraph({
			personId: input.userId,
			uploadedReports: memberReports,
			storedMetrics: memberMetrics,
		})

		const reportRefs = sortReports(memberReports.map(mapReportRef))
		const latestReport =
			reportRefs.find((report) => report.isDisplayReady) ??
			reportRefs[0] ??
			null
		const previousReports = latestReport
			? reportRefs.filter((report) => report.id !== latestReport.id)
			: reportRefs.slice(1)

		const rankable = buildRankableMetrics({
			reports: memberReports,
			storedMetrics: memberMetrics,
		})
		const metrics = rankHealthMetrics(rankable)
		const partitions = partitionRankedMetrics(metrics)
		const trendAnalysis = buildTrendAnalysis(graph)
		const healthScore = computeHealthScore(metrics)

		const limitations = buildKnowledgeLimitations({
			reports: reportRefs,
			metrics,
			coverage,
			uploadedReports: memberReports,
			processingCount: countProcessingReports(memberReports),
		})

		const limitationCodes = new Set(limitations.map((item) => item.code))
		const insights = buildKnowledgeInsights({ graph, metrics, coverage })
		const recommendations = buildKnowledgeRecommendations({
			metrics,
			coverage,
			limitationCodes,
		})

		const timeline = buildKnowledgeTimeline({
			reports: reportRefs,
			metrics,
			graph,
		})

		const summary = buildDeterministicSummary({
			reports: reportRefs,
			metrics,
			criticalCount: partitions.critical.length,
			abnormalCount: partitions.abnormal.length,
			latestReport,
		})

		const confidence = buildKnowledgeConfidence({
			metrics,
			reports: reportRefs,
			displayReadyCount: coverage.displayReadyCount,
		})

		const buildDurationMs = Math.round(performance.now() - startedAt)

		const knowledge: HealthKnowledge = {
			patient: { userId: input.userId },
			familyMember: resolveFamilyMember(raw, input),
			latestReport,
			previousReports,
			metrics,
			abnormalMetrics: partitions.abnormal,
			normalMetrics: partitions.normal,
			criticalMetrics: partitions.critical,
			borderlineMetrics: partitions.borderline,
			trendAnalysis,
			healthScore,
			timeline,
			insights,
			recommendations,
			confidence,
			limitations,
			sources: buildSources({ reports: reportRefs, metrics }),
			summary,
			generatedAt: new Date().toISOString(),
			buildDurationMs,
		}

		logHealthKnowledgeBuild({
			buildDurationMs,
			reportsProcessed: memberReports.length,
			metricsLoaded: metrics.length,
			abnormalCount: partitions.abnormal.length,
			criticalCount: partitions.critical.length,
			timelineEvents: timeline.length,
			confidenceOverall: confidence.overall,
			userId: input.userId,
			familyMemberId: input.familyMemberId ?? null,
		})

		return knowledge
	}
}

export const healthKnowledgeProvider = new HealthKnowledgeProvider()

export function healthKnowledgeToPayload(
	knowledge: HealthKnowledge,
): Record<string, unknown> {
	return {
		reports: [
			...(knowledge.latestReport ? [knowledge.latestReport] : []),
			...knowledge.previousReports,
		].map((report) => ({
			id: report.id,
			title: report.title,
			date: report.date,
			lab: report.lab,
			summary: knowledge.summary.lines.join(' '),
			metrics: knowledge.metrics
				.filter((metric) => metric.reportId === report.id)
				.map((metric) => ({
					id: metric.id,
					displayName: metric.displayName,
					value: metric.value,
					unit: metric.unit,
					status: metric.status,
					categoryId: metric.categoryId,
					observedAt: metric.observedAt,
					confidence: metric.confidence,
					source: metric.source,
				})),
		})),
		insights: knowledge.insights.map((insight) => insight.text),
		alerts: knowledge.criticalMetrics.map(
			(metric) => `${metric.displayName}: ${metric.value}`,
		),
		coverageNotes: knowledge.limitations.map(
			(limitation) => limitation.message,
		),
		summaryLines: knowledge.summary.lines,
	}
}
