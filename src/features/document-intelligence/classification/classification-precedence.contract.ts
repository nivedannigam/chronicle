import type { FactProvenance } from '@/core/platform/contracts/fact-provenance.contract'

/** Where a document classification decision originated. */
export type ClassificationSource =
	| 'CONTENT_AI'
	| 'CONTENT_PARSER'
	| 'FOLDER'
	| 'FILENAME'
	| 'HEURISTIC'
	| 'UNKNOWN'

/** Precedence order — lower index wins when sources conflict. */
export const CLASSIFICATION_PRECEDENCE: readonly ClassificationSource[] = [
	'CONTENT_AI',
	'CONTENT_PARSER',
	'FOLDER',
	'FILENAME',
	'HEURISTIC',
	'UNKNOWN',
] as const

export interface ClassificationDecision {
	classification: string
	source: ClassificationSource
	confidence: number
	provenance: FactProvenance
	needsReview: boolean
}

export function resolveClassificationPrecedence(
	candidates: ClassificationDecision[],
): ClassificationDecision {
	if (candidates.length === 0) {
		return {
			classification: 'unknown',
			source: 'UNKNOWN',
			confidence: 0,
			provenance: 'NEEDS_REVIEW',
			needsReview: true,
		}
	}

	const sorted = [...candidates].sort(
		(left, right) =>
			CLASSIFICATION_PRECEDENCE.indexOf(left.source) -
			CLASSIFICATION_PRECEDENCE.indexOf(right.source),
	)

	const winner = sorted[0]!

	if (winner.confidence < 0.45 || winner.source === 'UNKNOWN') {
		return {
			...winner,
			needsReview: true,
			provenance: 'NEEDS_REVIEW',
		}
	}

	return winner
}
