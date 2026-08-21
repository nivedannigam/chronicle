import type {
	PropertyKnowledge,
	PropertyRecord,
} from '@/features/property-knowledge/types/property-knowledge.types'
import type { PropertyAskScope } from '@/features/property/types/property-ask.types'
import type {
	EvidenceBundle,
	EvidenceRequest,
	QuestionType,
} from '@/shared/ai/evidence-planning/types'

const RESOLVER_ID = 'property.evidence_resolver.v1'

function normalizeText(value: string): string {
	return value.toLowerCase().replace(/\s+/g, ' ')
}

function resolvePropertyScope(
	knowledge: PropertyKnowledge,
	question: string,
	scope?: PropertyAskScope,
): PropertyRecord | null {
	if (scope?.propertyId) {
		return (
			knowledge.properties.find(
				(property) =>
					property.id === scope.propertyId ||
					property.slug === scope.propertyId,
			) ?? null
		)
	}

	const normalized = normalizeText(question)

	for (const property of knowledge.properties) {
		if (normalized.includes(normalizeText(property.displayName))) {
			return property
		}

		if (property.city && normalized.includes(normalizeText(property.city))) {
			return property
		}
	}

	return knowledge.properties.length === 1 ? knowledge.properties[0]! : null
}

function buildMissingBundle(
	questionType: QuestionType,
	message: string,
): EvidenceBundle {
	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: 'Property record not found',
			lines: [],
			healthScore: null,
			limitations: [message],
		},
		metadata: {
			questionType,
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildFactLookup(
	property: PropertyRecord | null,
	question: string,
): EvidenceBundle {
	if (!property) {
		return buildMissingBundle(
			'FACT_LOOKUP',
			"I don't have a reliable property record for that question yet.",
		)
	}

	const lines: string[] = []

	if (/when did i buy|purchase date|when was.*purchased/i.test(question)) {
		lines.push(
			property.purchaseDate
				? `${property.displayName} was purchased on ${property.purchaseDate}.`
				: `I found ${property.displayName}, but I don't have a purchase date recorded yet.`,
		)
	} else if (/possession|when did we get possession/i.test(question)) {
		lines.push(
			property.possessionDate
				? `Possession for ${property.displayName} was recorded on ${property.possessionDate}.`
				: `I found ${property.displayName}, but I don't have a possession date recorded yet.`,
		)
	} else if (/who owns|ownership/i.test(question)) {
		lines.push(
			property.ownership === 'unknown'
				? `I have documents for ${property.displayName}, but ownership is not confirmed yet.`
				: `${property.displayName} ownership: ${property.ownerNames.join(' + ') || property.ownership}.`,
		)
	} else {
		lines.push(
			`${property.displayName} is on file${
				property.city ? ` in ${property.city}` : ''
			}${property.propertyTypeLabel ? ` · ${property.propertyTypeLabel}` : ''}.`,
		)
	}

	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: property.displayName,
			lines,
			healthScore: null,
			limitations: [],
		},
		metadata: {
			questionType: 'FACT_LOOKUP',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildEntityLookup(knowledge: PropertyKnowledge): EvidenceBundle {
	const lines = knowledge.properties.map(
		(property) =>
			`${property.displayName}${property.city ? ` · ${property.city}` : ''} · ${property.documentCount} document${property.documentCount === 1 ? '' : 's'}`,
	)

	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: 'Properties on file',
			lines,
			healthScore: null,
			limitations:
				lines.length > 0
					? []
					: [
							'No property records are organized yet. Connect your Home folder to get started.',
						],
		},
		metadata: {
			questionType: 'ENTITY_LOOKUP',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildCoverage(
	knowledge: PropertyKnowledge,
	property: PropertyRecord | null,
): EvidenceBundle {
	const lines = [
		...knowledge.attention.map((item) => `${item.headline} · ${item.subline}`),
	]

	if (property) {
		const docs = knowledge.documents.filter(
			(document) => document.propertyId === property.id,
		)
		lines.unshift(
			`${property.displayName}: ${docs.length} property document${docs.length === 1 ? '' : 's'} on file`,
		)
	}

	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: 'Property coverage',
			lines,
			healthScore: null,
			limitations:
				lines.length > 0
					? [
							'Property coverage is based on the property documents Chronicle currently has.',
						]
					: ['I do not have enough property documents to assess coverage yet.'],
		},
		metadata: {
			questionType: 'COVERAGE',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

function buildStatusOverview(
	knowledge: PropertyKnowledge,
	property: PropertyRecord | null,
): EvidenceBundle {
	if (!property) {
		return buildEntityLookup(knowledge)
	}

	const lines = [
		`${property.displayName} · ${property.documentCount} document${property.documentCount === 1 ? '' : 's'}`,
		...property.facts
			.slice(0, 4)
			.map((fact) => `${fact.label}: ${fact.displayValue}`),
	]

	return {
		reports: [],
		metrics: [],
		trends: [],
		timeline: [],
		summary: {
			headline: property.displayName,
			lines,
			healthScore: null,
			limitations: knowledge.limitations,
		},
		metadata: {
			questionType: 'STATUS_OVERVIEW',
			resolver: RESOLVER_ID,
			excluded: [],
		},
	}
}

export function isPropertyCoverageQuestion(question: string): boolean {
	return /missing|what documents|which documents|coverage|do you have all/i.test(
		question,
	)
}

export function isPropertyEntityLookupQuestion(question: string): boolean {
	return /what properties|which properties|what property documents|documents do i have for/i.test(
		question,
	)
}

export function resolvePropertyEvidence(input: {
	knowledge: PropertyKnowledge
	request: EvidenceRequest
	scope?: PropertyAskScope
}): EvidenceBundle {
	const property = resolvePropertyScope(
		input.knowledge,
		input.request.question,
		input.scope,
	)

	switch (input.request.questionType) {
		case 'FACT_LOOKUP':
			return buildFactLookup(property, input.request.question)
		case 'ENTITY_LOOKUP':
			return buildEntityLookup(input.knowledge)
		case 'COVERAGE':
			return buildCoverage(input.knowledge, property)
		case 'STATUS_OVERVIEW':
		case 'EXPLAIN':
		default:
			return buildStatusOverview(input.knowledge, property)
	}
}
