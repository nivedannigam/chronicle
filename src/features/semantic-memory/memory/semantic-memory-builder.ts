import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import type { UploadedHealthReport } from '@/features/health/types'
import { buildSemanticInsights } from '@/features/semantic-memory/insights/semantic-insights.engine'
import {
	buildSemanticEntities,
	buildSemanticRelationships,
} from '@/features/semantic-memory/relationships/relationship-model'
import {
	buildMetricHistoryRecords,
	buildYearTimeline,
} from '@/features/semantic-memory/timeline/timeline-engine'
import {
	createEmptySemanticMemory,
	type SemanticEntity,
	type SemanticMemory,
} from '@/features/semantic-memory/types/semantic-memory.types'

export interface BuildSemanticMemoryInput {
	personId: string
	graph: HealthKnowledgeGraph
	uploadedReports?: UploadedHealthReport[]
}

export function buildSemanticMemory(
	input: BuildSemanticMemoryInput,
): SemanticMemory {
	const memory = createEmptySemanticMemory(input.personId)
	const histories = input.graph.profile.metricHistories
	const metricHistories = buildMetricHistoryRecords(histories)
	const hospitals = extractHospitals(input.uploadedReports ?? [])
	const doctors = extractDoctors(input.uploadedReports ?? [])

	memory.metricHistories = metricHistories
	memory.timeline = buildYearTimeline(histories)
	memory.hospitals = hospitals
	memory.doctors = doctors
	memory.entities = buildSemanticEntities({
		graph: input.graph,
		metricHistories,
		hospitals,
		doctors,
	})
	memory.relationships = buildSemanticRelationships({
		graph: input.graph,
		personId: input.personId,
		metricHistories,
	})

	const abnormalReportCount = countAbnormalReports(histories)

	memory.insights = buildSemanticInsights({
		histories,
		metricHistories,
		abnormalReportCount,
	})
	memory.generatedAt = new Date().toISOString()

	return memory
}

function extractHospitals(reports: UploadedHealthReport[]): SemanticEntity[] {
	const hospitals = new Map<string, SemanticEntity>()

	for (const report of reports) {
		const parsed = getParsedHealthReport(report)
		const lab = parsed?.metadata.laboratory?.trim()

		if (!lab) {
			continue
		}

		const id = `hospital:${slugify(lab)}`

		if (!hospitals.has(id)) {
			hospitals.set(id, {
				id,
				type: 'hospital',
				canonicalId: slugify(lab),
				label: lab,
				aliases: [],
				sourceReportIds: [report.id],
				firstSeenAt: report.report_date ?? report.uploaded_at,
				lastSeenAt: report.report_date ?? report.uploaded_at,
			})
		} else {
			const entity = hospitals.get(id)!
			entity.sourceReportIds.push(report.id)
		}
	}

	return [...hospitals.values()]
}

function extractDoctors(reports: UploadedHealthReport[]): SemanticEntity[] {
	const doctors = new Map<string, SemanticEntity>()

	for (const report of reports) {
		const parsed = getParsedHealthReport(report)
		const doctor = parsed?.metadata.doctorName?.trim()

		if (!doctor) {
			continue
		}

		const id = `doctor:${slugify(doctor)}`

		if (!doctors.has(id)) {
			doctors.set(id, {
				id,
				type: 'doctor',
				canonicalId: slugify(doctor),
				label: doctor,
				aliases: [],
				sourceReportIds: [report.id],
				firstSeenAt: report.report_date ?? report.uploaded_at,
				lastSeenAt: report.report_date ?? report.uploaded_at,
			})
		} else {
			const entity = doctors.get(id)!
			entity.sourceReportIds.push(report.id)
		}
	}

	return [...doctors.values()]
}

function countAbnormalReports(
	histories: HealthKnowledgeGraph['profile']['metricHistories'],
): number {
	const abnormalReports = new Set<string>()

	for (const history of histories) {
		for (const observation of history.observations) {
			if (
				['low', 'high', 'critical', 'borderline'].includes(observation.status)
			) {
				abnormalReports.add(observation.reportId)
			}
		}
	}

	return abnormalReports.size
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
}
