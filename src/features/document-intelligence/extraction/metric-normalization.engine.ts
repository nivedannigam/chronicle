import { METRIC_DEFINITIONS } from '@/features/document-intelligence/extraction/metric-definitions'
import type { MetricDefinition } from '@/features/document-intelligence/domain/metric.types'

function normalizeKey(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9%()./+-]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function aliasMatchesMetricName(alias: string, key: string): boolean {
	const normalizedAlias = normalizeKey(alias)

	if (!normalizedAlias) {
		return false
	}

	if (normalizedAlias === key) {
		return true
	}

	const pattern = new RegExp(
		`\\b${escapeRegex(normalizedAlias).replace(/\s+/g, '\\s+')}\\b`,
		'i',
	)

	return pattern.test(key)
}

function definitionMatchScore(definition: MetricDefinition): number {
	return Math.max(
		definition.displayName.length,
		...definition.aliases.map((alias) => alias.length),
	)
}

const SORTED_METRIC_DEFINITIONS = [...METRIC_DEFINITIONS].sort(
	(a, b) => definitionMatchScore(b) - definitionMatchScore(a),
)

export function findMetricDefinition(rawName: string): MetricDefinition | null {
	const key = normalizeKey(rawName)
	let bestMatch: { definition: MetricDefinition; score: number } | null = null

	for (const definition of SORTED_METRIC_DEFINITIONS) {
		const candidates = [definition.displayName, ...definition.aliases].sort(
			(a, b) => b.length - a.length,
		)

		for (const alias of candidates) {
			if (!aliasMatchesMetricName(alias, key)) {
				continue
			}

			const score = normalizeKey(alias).length

			if (!bestMatch || score > bestMatch.score) {
				bestMatch = { definition, score }
			}
		}
	}

	return bestMatch?.definition ?? null
}

export function normalizeMetricName(rawName: string): {
	canonicalId: string | null
	displayName: string
} {
	const definition = findMetricDefinition(rawName)

	if (!definition) {
		return {
			canonicalId: null,
			displayName: rawName.trim(),
		}
	}

	return {
		canonicalId: definition.canonicalId,
		displayName: definition.displayName,
	}
}

export function getMetricDefinitions(): MetricDefinition[] {
	return METRIC_DEFINITIONS
}
