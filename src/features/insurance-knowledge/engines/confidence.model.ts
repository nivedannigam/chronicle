import type {
	InsuranceKnowledgeConfidence,
	InsuranceKnowledgePolicy,
} from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceDocumentRecord } from '@/features/insurance-knowledge/types/insurance-record.types'

export function buildKnowledgeConfidence(input: {
	policies: InsuranceKnowledgePolicy[]
	documents: InsuranceDocumentRecord[]
	displayReadyCount: number
}): InsuranceKnowledgeConfidence {
	const policyCount = input.policies.length
	const displayReadyCount = input.displayReadyCount
	const extractionConfidence =
		average(
			input.policies
				.map((policy) => policy.confidence)
				.filter((value) => value > 0),
		) ?? null

	const completenessFactors = [
		policyCount > 0 ? 1 : 0,
		displayReadyCount > 0 ? displayReadyCount / Math.max(policyCount, 1) : 0,
		input.policies.some((policy) => policy.sumInsured != null) ? 1 : 0,
		input.documents.some((document) => document.status === 'completed') ? 1 : 0,
	]

	const dataCompleteness =
		completenessFactors.reduce((sum, value) => sum + value, 0) /
		completenessFactors.length

	const policyCoverage = policyCount > 0 ? displayReadyCount / policyCount : 0

	const overall = clamp(
		dataCompleteness * 0.45 +
			policyCoverage * 0.35 +
			(extractionConfidence ?? 0.5) * 0.2,
	)

	return {
		overall,
		dataCompleteness,
		extractionConfidence,
		policyCoverage,
		policyCount,
		displayReadyCount,
	}
}

function average(values: number[]): number | null {
	if (values.length === 0) {
		return null
	}

	return values.reduce((sum, value) => sum + value, 0) / values.length
}

function clamp(value: number): number {
	return Math.max(0, Math.min(1, value))
}
