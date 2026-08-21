import type { PropertyKnowledge } from '@/features/property-knowledge/types/property-knowledge.types'
import { buildPropertyKnowledge } from '@/features/property-knowledge'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type {
	ChronicleKnowledgeProvider,
	KnowledgeProviderQuery,
	ProviderContextResult,
	SemanticSearchHit,
} from '@chronicle/core-knowledge'
import { createEmptyContextPackage } from '@chronicle/core-knowledge'
import {
	registerKnowledgeProvider,
	scoreTextMatch,
	tokenizeQuery,
} from '@chronicle/core-search'

const PROVIDER_ID = 'property'

function resolvePropertyKnowledge(
	query: KnowledgeProviderQuery,
): PropertyKnowledge | null {
	const source = query.sources[PROVIDER_ID] as
		| {
				knowledge?: PropertyKnowledge
				documents?: ChronicleDocument[]
				userId?: string
				hasFolderAssigned?: boolean
				rootFolderPath?: string | null
		  }
		| undefined

	if (source?.knowledge) {
		return source.knowledge
	}

	if (source?.documents && source.userId) {
		return buildPropertyKnowledge({
			userId: source.userId,
			documents: source.documents,
			members: [],
			hasFolderAssigned: source.hasFolderAssigned ?? false,
			rootFolderPath: source.rootFolderPath ?? null,
		})
	}

	return null
}

function searchPropertyRecords(input: {
	question: string
	knowledge: PropertyKnowledge
}): SemanticSearchHit[] {
	const tokens = tokenizeQuery(input.question)
	const hits: SemanticSearchHit[] = []

	for (const property of input.knowledge.properties) {
		const body = [
			property.displayName,
			property.propertyTypeLabel,
			property.city ?? '',
			property.address ?? '',
			property.societyName ?? '',
		].join(' ')
		const score = scoreTextMatch(tokens, body)

		if (score <= 0) {
			continue
		}

		hits.push({
			id: `property-entity-${property.id}`,
			domain: 'property',
			kind: 'entity',
			title: property.displayName,
			snippet: `Property · ${property.displayName}`,
			score,
			reportId: property.slug,
			reportType: property.propertyType,
			memberId: property.ownerMemberIds[0] ?? null,
		})
	}

	for (const document of input.knowledge.documents) {
		const body = [
			document.title,
			document.fileName,
			document.typeLabel,
			document.summary,
			document.folderPath ?? '',
		].join(' ')
		const score = scoreTextMatch(tokens, body)

		if (score <= 0) {
			continue
		}

		hits.push({
			id: `property-doc-${document.id}`,
			domain: 'property',
			kind: 'report',
			title: document.title,
			snippet: `Property · ${document.typeLabel}`,
			score,
			reportId: document.chronicleDocumentId,
			reportType: document.typeId,
			memberId: document.ownerMemberId,
		})
	}

	for (const property of input.knowledge.properties) {
		for (const fact of property.facts) {
			const body = [fact.label, fact.displayValue, property.displayName].join(
				' ',
			)
			const score = scoreTextMatch(tokens, body)

			if (score <= 0) {
				continue
			}

			hits.push({
				id: `property-fact-${property.id}-${fact.key}`,
				domain: 'property',
				kind: 'entity',
				title: `${property.displayName} · ${fact.label}`,
				snippet: `Property · ${property.displayName}`,
				score: score * 0.9,
				reportId: property.slug,
				reportType: fact.key,
				memberId: property.ownerMemberIds[0] ?? null,
			})
		}
	}

	for (const event of input.knowledge.timeline) {
		const property = input.knowledge.properties.find(
			(entry) => entry.id === event.propertyId,
		)
		const body = [
			event.title,
			property?.displayName ?? '',
			event.eventType,
		].join(' ')
		const score = scoreTextMatch(tokens, body)

		if (score <= 0) {
			continue
		}

		hits.push({
			id: `property-event-${event.id}`,
			domain: 'property',
			kind: 'timeline',
			title: event.title,
			snippet: `Property · ${property?.displayName ?? 'Event'}`,
			score,
			reportId: event.id,
			reportType: event.eventType,
			memberId: property?.ownerMemberIds[0] ?? null,
			date: event.eventDate,
		})
	}

	return hits
}

class PropertyIntelligenceProvider implements ChronicleKnowledgeProvider {
	readonly id = PROVIDER_ID
	readonly domain = 'property' as const
	readonly label = 'Property'
	readonly priority = 15

	supports(query: KnowledgeProviderQuery): boolean {
		return resolvePropertyKnowledge(query) != null
	}

	search(query: KnowledgeProviderQuery): SemanticSearchHit[] {
		const knowledge = resolvePropertyKnowledge(query)

		if (!knowledge) {
			return []
		}

		return searchPropertyRecords({
			question: query.resolvedQuestion,
			knowledge,
		})
	}

	retrieveContext(query: KnowledgeProviderQuery): ProviderContextResult {
		const knowledge = resolvePropertyKnowledge(query)

		if (!knowledge) {
			return {
				providerId: this.id,
				domain: this.domain,
				available: false,
				package: null,
				unavailableReason: 'No property records are available yet.',
			}
		}

		return {
			providerId: this.id,
			domain: this.domain,
			available: true,
			package: {
				...createEmptyContextPackage(),
				summaryLines: [
					`${knowledge.summary.propertyCount} propert${knowledge.summary.propertyCount === 1 ? 'y' : 'ies'} organized.`,
					knowledge.summary.subline,
					...knowledge.timeline
						.slice(0, 3)
						.map((event) => `${event.title} · ${event.eventDate}`),
				],
			},
		}
	}
}

export const propertyIntelligenceProvider = new PropertyIntelligenceProvider()

registerKnowledgeProvider(propertyIntelligenceProvider)
