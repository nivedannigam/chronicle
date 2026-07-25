import type { RetrievedKnowledge } from '@/features/knowledge/retrieval/knowledge-retriever.types'
import type {
	ReportDisagreement,
	TrustConfidence,
} from '@/features/ask/trust/trust.types'
import type { ConfidenceLevel } from '@/features/intelligence/types/confidence.types'
import { toConfidenceLevel } from '@/features/intelligence/types/confidence.types'

export function detectReportDisagreements(
	knowledge: RetrievedKnowledge,
): ReportDisagreement[] {
	const byMetric = new Map<
		string,
		Array<{
			reportId: string
			reportTitle: string
			date: string
			value: string
			status: string
			displayName: string
		}>
	>()

	for (const observation of knowledge.observations) {
		const bucket = byMetric.get(observation.metricId) ?? []
		bucket.push({
			reportId: observation.reportId,
			reportTitle: observation.reportTitle,
			date: observation.observedAt,
			value: observation.value,
			status: observation.status,
			displayName: observation.displayName,
		})
		byMetric.set(observation.metricId, bucket)
	}

	const disagreements: ReportDisagreement[] = []

	for (const [metricId, readings] of byMetric.entries()) {
		const uniqueReports = dedupeByReport(readings)

		if (uniqueReports.length < 2) {
			continue
		}

		const normalizedValues = new Set(
			uniqueReports.map((reading) => normalizeValue(reading.value)),
		)

		if (normalizedValues.size <= 1) {
			continue
		}

		const displayName = uniqueReports[0]!.displayName

		disagreements.push({
			id: `disagree-${metricId}`,
			metricId,
			metricName: displayName,
			values: uniqueReports.map((reading) => ({
				reportId: reading.reportId,
				reportTitle: reading.reportTitle,
				date: reading.date,
				value: reading.value,
				status: reading.status,
			})),
			explanation: `Your Chronicle records show different ${displayName} values across reports. Chronicle presents all recorded values rather than choosing one silently.`,
		})
	}

	return disagreements.slice(0, 4)
}

function dedupeByReport<T extends { reportId: string }>(items: T[]): T[] {
	const seen = new Set<string>()

	return items.filter((item) => {
		if (seen.has(item.reportId)) {
			return false
		}

		seen.add(item.reportId)
		return true
	})
}

function normalizeValue(value: string): string {
	const match = value.match(/-?\d+\.?\d*/)

	return match?.[0] ?? value.trim().toLowerCase()
}

export function computeTrustConfidence(input: {
	dataAvailable: boolean
	reportCount: number
	metricCount: number
	evidenceItemCount: number
	disagreementCount: number
	hasStructuredMetrics: boolean
	hasOcrEvidence: boolean
	intentConfidence?: number
}): TrustConfidence {
	const factors: string[] = []

	if (!input.dataAvailable) {
		return {
			level: 'low',
			score: 0.3,
			factors: ['No matching records found in Chronicle'],
		}
	}

	let score = 0.45

	if (input.reportCount >= 1) {
		score += 0.1
		factors.push(
			`${input.reportCount} supporting report${input.reportCount === 1 ? '' : 's'}`,
		)
	}

	if (input.reportCount >= 2) {
		score += 0.08
		factors.push('Multiple reports available')
	}

	if (input.metricCount >= 1) {
		score += 0.1
		factors.push(
			`${input.metricCount} structured metric${input.metricCount === 1 ? '' : 's'}`,
		)
	}

	if (input.hasStructuredMetrics) {
		score += 0.05
		factors.push('Structured extraction data used')
	}

	if (input.hasOcrEvidence) {
		score += 0.03
		factors.push('OCR text available as supporting context')
	}

	if (input.evidenceItemCount >= 2) {
		score += 0.05
		factors.push('Multiple evidence items linked')
	}

	if (input.disagreementCount > 0) {
		score -= 0.12 * Math.min(input.disagreementCount, 3)
		factors.push(
			`${input.disagreementCount} metric disagreement${input.disagreementCount === 1 ? '' : 's'} surfaced`,
		)
	}

	if ((input.intentConfidence ?? 0) >= 0.85) {
		score += 0.04
	}

	score = Math.max(0.25, Math.min(0.95, score))

	const level: ConfidenceLevel = toConfidenceLevel(score)

	if (level === 'low') {
		factors.push('Limited supporting evidence — interpret cautiously')
	}

	return { level, score, factors }
}
