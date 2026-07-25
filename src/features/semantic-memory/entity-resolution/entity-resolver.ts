import { normalizeMetricName } from '@/features/document-intelligence/extraction/metric-normalization.engine'
import { getMetricDefinitions } from '@/features/document-intelligence/extraction/metric-normalization.engine'

export interface ResolvedConcept {
	canonicalId: string
	displayName: string
	aliases: string[]
	entityType: 'metric' | 'finding' | 'diagnosis'
}

const FINDING_ALIASES: Array<{
	pattern: RegExp
	canonicalId: string
	label: string
}> = [
	{
		pattern: /\bfatty liver\b|\bhepatic steatosis\b/i,
		canonicalId: 'finding:fatty-liver',
		label: 'Fatty liver',
	},
	{
		pattern: /\belevated ldl\b|\bhigh ldl\b/i,
		canonicalId: 'finding:elevated-ldl',
		label: 'Elevated LDL',
	},
	{
		pattern: /\bdiabetes\b|\bprediabetes\b/i,
		canonicalId: 'finding:diabetes',
		label: 'Diabetes risk',
	},
	{
		pattern: /\bhypertension\b|\bhigh blood pressure\b/i,
		canonicalId: 'finding:hypertension',
		label: 'Hypertension',
	},
	{
		pattern: /\banemia\b|\blow hemoglobin\b/i,
		canonicalId: 'finding:anemia',
		label: 'Anemia',
	},
	{
		pattern: /\bvitamin d deficiency\b|\blow vitamin d\b/i,
		canonicalId: 'finding:vitamin-d-deficiency',
		label: 'Vitamin D deficiency',
	},
]

/** Resolves raw metric names (SGPT, ALT, Alanine Aminotransferase) to canonical IDs. */
export function resolveMetric(rawName: string): ResolvedConcept {
	const normalized = normalizeMetricName(rawName)

	return {
		canonicalId: normalized.canonicalId ?? `raw:${slugify(rawName)}`,
		displayName: normalized.displayName,
		aliases: collectAliases(normalized.canonicalId, rawName),
		entityType: 'metric',
	}
}

/** Resolves free-text concepts to canonical findings or metrics. */
export function resolveConcept(text: string): ResolvedConcept | null {
	for (const finding of FINDING_ALIASES) {
		if (finding.pattern.test(text)) {
			return {
				canonicalId: finding.canonicalId,
				displayName: finding.label,
				aliases: [finding.label],
				entityType: 'finding',
			}
		}
	}

	const metric = resolveMetric(text)

	if (metric.canonicalId.startsWith('raw:')) {
		return null
	}

	return metric
}

/** Returns all known aliases for a canonical metric ID. */
export function getCanonicalAliases(canonicalId: string): string[] {
	const definition = getMetricDefinitions().find(
		(item) => item.canonicalId === canonicalId,
	)

	if (!definition) {
		return []
	}

	return [definition.displayName, ...definition.aliases]
}

function collectAliases(canonicalId: string | null, rawName: string): string[] {
	const aliases = new Set<string>([rawName])

	if (canonicalId) {
		for (const alias of getCanonicalAliases(canonicalId)) {
			aliases.add(alias)
		}
	}

	return [...aliases]
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
}
