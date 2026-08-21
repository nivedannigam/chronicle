import type { FinancialFactRecord } from '@/features/finance-knowledge/types/finance-extraction.types'
import type {
	FinanceCurrentFact,
	FinanceObservation,
} from '@/features/finance-knowledge/types/finance-history.types'

function normalizeValue(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function compareFinancialDates(
	left: string | null,
	right: string | null,
): number {
	if (!left && !right) return 0
	if (!left) return 1
	if (!right) return -1
	return Date.parse(right) - Date.parse(left)
}

export function observationFromFactRecord(
	fact: FinancialFactRecord,
): FinanceObservation {
	return {
		id: fact.id,
		entityId: fact.entityId,
		factType: fact.factType,
		value: fact.value,
		unit: fact.unit,
		currency: fact.currency,
		asOfDate: fact.asOfDate,
		sourceDocumentId: fact.sourceDocumentId,
		sourceDocumentIds: [fact.sourceDocumentId],
		sourcePage: fact.sourcePage,
		confidence: fact.confidence,
		extractionMethod: fact.extractionMethod,
		verified: fact.verified,
		isConflicting: false,
		conflictGroupId: null,
	}
}

export function buildObservationSemanticKey(input: {
	entityId: string
	factType: string
	asOfDate: string | null
	value: string
}): string {
	return `${input.entityId}:${input.factType}:${input.asOfDate ?? 'na'}:${normalizeValue(input.value)}`
}

export function buildObservationConflictKey(input: {
	entityId: string
	factType: string
	asOfDate: string | null
}): string {
	return `${input.entityId}:${input.factType}:${input.asOfDate ?? 'na'}`
}

export function mergeObservationsWithoutDoubleCounting(
	existing: FinanceObservation[],
	incoming: FinanceObservation[],
): FinanceObservation[] {
	const map = new Map<string, FinanceObservation>()

	for (const observation of [...existing, ...incoming]) {
		const semanticKey = buildObservationSemanticKey(observation)
		const current = map.get(semanticKey)

		if (!current) {
			map.set(semanticKey, observation)
			continue
		}

		map.set(semanticKey, {
			...current,
			sourceDocumentIds: [
				...new Set([
					...current.sourceDocumentIds,
					...observation.sourceDocumentIds,
				]),
			],
			confidence:
				current.confidence === 'high' || observation.confidence === 'high'
					? 'high'
					: current.confidence === 'medium' ||
						  observation.confidence === 'medium'
						? 'medium'
						: 'low',
			verified: current.verified || observation.verified,
		})
	}

	return [...map.values()]
}

export function markConflictingObservations(
	observations: FinanceObservation[],
): FinanceObservation[] {
	const groups = new Map<string, FinanceObservation[]>()

	for (const observation of observations) {
		if (!observation.verified) continue

		const key = buildObservationConflictKey(observation)
		const group = groups.get(key) ?? []
		group.push(observation)
		groups.set(key, group)
	}

	const conflictGroupIds = new Map<string, string>()

	for (const [key, group] of groups.entries()) {
		const uniqueValues = new Set(
			group.map((entry) => normalizeValue(entry.value)),
		)
		if (uniqueValues.size <= 1) continue

		conflictGroupIds.set(key, `conflict:${key}`)
	}

	return observations.map((observation) => {
		const key = buildObservationConflictKey(observation)
		const conflictGroupId = conflictGroupIds.get(key) ?? null

		return {
			...observation,
			isConflicting: conflictGroupId != null,
			conflictGroupId,
		}
	})
}

export function selectCurrentFactsForEntity(input: {
	entityId: string
	observations: FinanceObservation[]
}): FinanceCurrentFact[] {
	const verified = input.observations.filter(
		(observation) =>
			observation.entityId === input.entityId && observation.verified,
	)

	const byFactType = new Map<string, FinanceObservation[]>()

	for (const observation of verified) {
		const group = byFactType.get(observation.factType) ?? []
		group.push(observation)
		byFactType.set(observation.factType, group)
	}

	const currentFacts: FinanceCurrentFact[] = []

	for (const [factType, group] of byFactType.entries()) {
		const sorted = [...group].sort((left, right) =>
			compareFinancialDates(left.asOfDate, right.asOfDate),
		)

		const latestDate = sorted[0]?.asOfDate ?? null
		const latestGroup = sorted.filter((entry) => entry.asOfDate === latestDate)
		const uniqueLatestValues = new Set(
			latestGroup.map((entry) => normalizeValue(entry.value)),
		)
		const hasConflict = uniqueLatestValues.size > 1

		const previous = sorted.find(
			(entry) => entry.asOfDate !== latestDate && !entry.isConflicting,
		)

		currentFacts.push({
			entityId: input.entityId,
			factType,
			value: hasConflict ? null : (latestGroup[0]?.value ?? null),
			asOfDate: latestDate,
			previousValue: previous?.value ?? null,
			previousAsOfDate: previous?.asOfDate ?? null,
			changeFromPrevious:
				!hasConflict && latestGroup[0] && previous
					? `${latestGroup[0].value} (was ${previous.value})`
					: null,
			sourceDocumentId: hasConflict
				? null
				: (latestGroup[0]?.sourceDocumentId ?? null),
			confidence: hasConflict ? null : (latestGroup[0]?.confidence ?? null),
			hasConflict,
			conflictingSourceDocumentIds: hasConflict
				? [...new Set(latestGroup.map((entry) => entry.sourceDocumentId))]
				: [],
		})
	}

	return currentFacts
}

export function buildObservationsFromFacts(
	facts: FinancialFactRecord[],
): FinanceObservation[] {
	const observations = facts
		.filter((fact) => fact.verified)
		.map(observationFromFactRecord)

	return markConflictingObservations(
		mergeObservationsWithoutDoubleCounting([], observations),
	)
}
