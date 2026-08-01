import {
	healthKnowledgeProvider,
	type HealthKnowledgeProvider as ProductionHealthKnowledgeProvider,
} from '@/features/health-knowledge/providers/health-knowledge.provider'
import type { HealthKnowledge } from '@/features/health-knowledge/types/health-knowledge-object.types'
import type {
	KnowledgeEvidenceItem,
	KnowledgeMetric,
	KnowledgeProvider,
	KnowledgeReport,
	KnowledgeRetrievalInput,
	NormalizedKnowledge,
} from '@/shared/ai/types/knowledge.types'

interface HealthReportPayload {
	id: string
	title: string
	date: string
	lab?: string
	summary?: string
	metrics?: Array<{
		id?: string
		displayName: string
		value: string | number
		unit?: string | null
		status?: string
		categoryId?: string
		observedAt?: string
	}>
}

interface HealthKnowledgePayload {
	reports: HealthReportPayload[]
	insights: string[]
	alerts: string[]
	coverageNotes: string[]
	summaryLines: string[]
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
}

function parseHealthPayload(
	payload: Record<string, unknown>,
): HealthKnowledgePayload {
	const reports = Array.isArray(payload.reports)
		? (payload.reports as HealthReportPayload[])
		: []

	return {
		reports,
		insights: Array.isArray(payload.insights)
			? (payload.insights as string[])
			: [],
		alerts: Array.isArray(payload.alerts) ? (payload.alerts as string[]) : [],
		coverageNotes: Array.isArray(payload.coverageNotes)
			? (payload.coverageNotes as string[])
			: [],
		summaryLines: Array.isArray(payload.summaryLines)
			? (payload.summaryLines as string[])
			: [],
		familyMemberId:
			typeof payload.familyMemberId === 'string'
				? payload.familyMemberId
				: null,
		accountOwnerMemberId:
			typeof payload.accountOwnerMemberId === 'string'
				? payload.accountOwnerMemberId
				: null,
	}
}

function mapReport(report: HealthReportPayload): KnowledgeReport {
	return {
		id: report.id,
		title: report.title,
		date: report.date,
		lab: report.lab ?? '',
		summary: report.summary,
	}
}

function mapMetrics(report: HealthReportPayload): KnowledgeMetric[] {
	return (report.metrics ?? []).map((metric, index) => ({
		id: metric.id ?? `${report.id}-metric-${index}`,
		displayName: metric.displayName,
		value: String(metric.value),
		unit: metric.unit ?? null,
		status: metric.status ?? 'unknown',
		categoryId: metric.categoryId,
		reportId: report.id,
		observedAt: metric.observedAt ?? report.date,
	}))
}

function buildEvidenceFromPayload(
	reports: HealthReportPayload[],
	metrics: KnowledgeMetric[],
): KnowledgeEvidenceItem[] {
	const evidence: KnowledgeEvidenceItem[] = []

	for (const report of reports.slice(0, 6)) {
		evidence.push({
			id: `report-${report.id}`,
			sourceType: 'health_report',
			label: report.title,
			excerpt: report.summary,
			date: report.date,
		})
	}

	for (const metric of metrics.slice(0, 8)) {
		evidence.push({
			id: `metric-${metric.id}`,
			sourceType: 'health_metric',
			label: metric.displayName,
			metricName: metric.displayName,
			metricValue: metric.unit
				? `${metric.value} ${metric.unit}`
				: metric.value,
			date: metric.observedAt,
		})
	}

	return evidence
}

function normalizeFromPayload(
	input: KnowledgeRetrievalInput,
	payload: HealthKnowledgePayload,
): NormalizedKnowledge {
	const reports = payload.reports.map(mapReport)
	const metrics = payload.reports.flatMap(mapMetrics)
	const dataAvailable = reports.length > 0 || metrics.length > 0

	return {
		domain: 'health',
		intent: input.intent,
		question: input.question,
		reports,
		metrics,
		insights: payload.insights,
		alerts: payload.alerts,
		evidence: buildEvidenceFromPayload(payload.reports, metrics),
		summaryLines: payload.summaryLines,
		coverageNotes: payload.coverageNotes,
		dataAvailable,
	}
}

function normalizeFromHealthKnowledge(
	input: KnowledgeRetrievalInput,
	knowledge: HealthKnowledge,
): NormalizedKnowledge {
	const reports: KnowledgeReport[] = [
		...(knowledge.latestReport ? [knowledge.latestReport] : []),
		...knowledge.previousReports,
	].map((report) => ({
		id: report.id,
		title: report.title,
		date: report.date,
		lab: report.lab,
		summary: knowledge.summary.headline,
	}))

	const metrics: KnowledgeMetric[] = knowledge.metrics.map((metric) => ({
		id: metric.id,
		displayName: metric.displayName,
		value: metric.value,
		unit: metric.unit,
		status: metric.status,
		categoryId: metric.categoryId,
		reportId: metric.reportId,
		observedAt: metric.observedAt,
	}))

	const evidence: KnowledgeEvidenceItem[] = [
		...knowledge.timeline.slice(0, 8).map((event) => ({
			id: event.id,
			sourceType: event.type,
			label: event.title,
			excerpt: event.description,
			date: event.date,
		})),
		...knowledge.metrics.slice(0, 8).map((metric) => ({
			id: `metric-${metric.id}`,
			sourceType: 'health_metric',
			label: metric.displayName,
			metricName: metric.displayName,
			metricValue: metric.unit
				? `${metric.value} ${metric.unit}`
				: metric.value,
			date: metric.observedAt,
		})),
	]

	return {
		domain: 'health',
		intent: input.intent,
		question: input.question,
		reports,
		metrics,
		insights: knowledge.insights.map((insight) => insight.text),
		alerts: knowledge.criticalMetrics.map(
			(metric) => `${metric.displayName}: ${metric.value}`,
		),
		evidence,
		summaryLines: knowledge.summary.lines,
		coverageNotes: knowledge.limitations.map(
			(limitation) => limitation.message,
		),
		dataAvailable: reports.length > 0 || metrics.length > 0,
	}
}

/**
 * AI Platform adapter — delegates to production HealthKnowledgeProvider when userId
 * is available; falls back to caller-supplied payloads for tests and offline use.
 */
export class HealthKnowledgePlatformAdapter implements KnowledgeProvider {
	readonly domain = 'health' as const
	private readonly productionProvider: ProductionHealthKnowledgeProvider

	constructor(
		productionProvider: ProductionHealthKnowledgeProvider = healthKnowledgeProvider,
	) {
		this.productionProvider = productionProvider
	}

	async retrieve(input: KnowledgeRetrievalInput): Promise<NormalizedKnowledge> {
		const payload = parseHealthPayload(input.payload)
		const useProduction =
			Boolean(input.userId) &&
			payload.reports.length === 0 &&
			!input.payload.forcePayloadOnly

		if (useProduction && input.userId) {
			const knowledge = await this.productionProvider.getKnowledge({
				userId: input.userId,
				familyMemberId: payload.familyMemberId,
				accountOwnerMemberId: payload.accountOwnerMemberId,
			})

			return normalizeFromHealthKnowledge(input, knowledge)
		}

		return normalizeFromPayload(input, payload)
	}
}

/** @deprecated Use HealthKnowledgePlatformAdapter — kept for registry compatibility */
export const HealthKnowledgeProvider = HealthKnowledgePlatformAdapter

export { healthKnowledgeProvider as productionHealthKnowledgeProvider }
