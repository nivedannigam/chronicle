import type { FinanceKnowledge } from '@/features/finance-knowledge/types/finance-knowledge.types'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import type { EvidenceBundle } from '@/shared/ai/evidence-planning/types'
import type { NormalizedKnowledge } from '@/shared/ai/types/knowledge.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'

export function domainEvidenceToNormalized(input: {
	domain: KnowledgeDomainId
	intent: string
	question: string
	bundle: EvidenceBundle
	insuranceKnowledge?: InsuranceKnowledge
	vehicleKnowledge?: VehicleKnowledge
	financeKnowledge?: FinanceKnowledge
}): NormalizedKnowledge {
	const reports = input.bundle.reports.map((report) => ({
		id: report.id,
		title: report.title,
		date: report.date,
		lab: report.lab,
		summary: report.reportType ?? undefined,
	}))

	const metrics = input.bundle.metrics.map((metric) => ({
		id: metric.id,
		displayName: metric.displayName,
		value: metric.value,
		unit: metric.unit,
		status: metric.status,
		reportId: metric.reportId,
		observedAt: metric.observedAt,
	}))

	const dataAvailable =
		input.domain === 'insurance'
			? Boolean(input.insuranceKnowledge?.policies.length)
			: input.domain === 'vehicles'
				? Boolean(input.vehicleKnowledge?.hasVehicles)
				: input.domain === 'finance'
					? Boolean(
							input.financeKnowledge?.hasDocuments ||
							input.financeKnowledge?.bankAccounts.length ||
							input.financeKnowledge?.loans.length ||
							input.financeKnowledge?.investmentAccounts.length ||
							input.financeKnowledge?.creditCards.length,
						)
					: reports.length > 0 || metrics.length > 0

	return {
		domain: input.domain,
		intent: input.intent,
		question: input.question,
		reports,
		metrics,
		insights: input.bundle.summary.lines,
		alerts: [],
		evidence: reports.map((report) => ({
			id: report.id,
			sourceType: 'report',
			label: report.title,
			date: report.date,
		})),
		summaryLines: input.bundle.summary.lines,
		coverageNotes: input.bundle.summary.limitations,
		dataAvailable,
	}
}
