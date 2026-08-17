import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import { vehicleKnowledgeProvider } from '@/features/vehicle-knowledge'
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

const PROVIDER_ID = 'vehicles'

function resolveVehicleKnowledge(
	query: KnowledgeProviderQuery,
): VehicleKnowledge | null {
	const source = query.sources[PROVIDER_ID] as
		| {
				knowledge?: VehicleKnowledge
				rawData?: Parameters<
					typeof vehicleKnowledgeProvider.buildFromRawData
				>[0]
				userId?: string
				familyMemberId?: string | null
				accountOwnerMemberId?: string | null
		  }
		| undefined

	if (source?.knowledge) {
		return source.knowledge
	}

	if (source?.rawData && source.userId) {
		return vehicleKnowledgeProvider.buildFromRawData(source.rawData, {
			userId: source.userId,
			familyMemberId: source.familyMemberId ?? null,
			accountOwnerMemberId: source.accountOwnerMemberId ?? null,
		})
	}

	return null
}

function searchVehicles(input: {
	question: string
	knowledge: VehicleKnowledge
}): SemanticSearchHit[] {
	const tokens = tokenizeQuery(input.question)
	const hits: SemanticSearchHit[] = []

	for (const vehicle of input.knowledge.vehicles) {
		const body = [
			vehicle.displayName,
			vehicle.registrationNumber ?? '',
			vehicle.make ?? '',
			vehicle.model ?? '',
			vehicle.vin ?? '',
			vehicle.currentState.insurance.label,
			vehicle.currentState.puc.label,
		].join(' ')
		const score = scoreTextMatch(tokens, body)

		if (score > 0) {
			hits.push({
				id: `vehicle-${vehicle.id}`,
				domain: 'vehicles',
				kind: 'entity',
				title: vehicle.displayName,
				snippet: vehicle.registrationNumber
					? `Registration ${vehicle.registrationNumber}`
					: 'Vehicle profile',
				score,
			})
		}
	}

	for (const document of input.knowledge.documents) {
		const vehicle = input.knowledge.vehicles.find(
			(entry) => entry.id === document.vehicleId,
		)
		const body = [
			document.fileName,
			vehicle?.displayName ?? '',
			document.documentType,
			document.documentSubtype,
		].join(' ')
		const score = scoreTextMatch(tokens, body)

		if (score > 0) {
			hits.push({
				id: `vehicle-doc-${document.id}`,
				domain: 'vehicles',
				kind: 'report',
				title: document.fileName,
				snippet: `${vehicle?.displayName ?? 'Vehicle'} · ${document.documentType}`,
				score,
				reportId: document.id,
			})
		}
	}

	for (const fact of input.knowledge.facts) {
		const vehicle = input.knowledge.vehicles.find(
			(entry) => entry.id === fact.vehicleId,
		)
		const body = [
			fact.label,
			fact.displayValue,
			fact.factKey.replace(/_/g, ' '),
			vehicle?.displayName ?? '',
			fact.sourceDocumentName ?? '',
		].join(' ')
		const score = scoreTextMatch(tokens, body)

		if (score > 0) {
			hits.push({
				id: `vehicle-fact-${fact.id}`,
				domain: 'vehicles',
				kind: 'metric',
				title: `${vehicle?.displayName ?? 'Vehicle'} · ${fact.label}`,
				snippet: `${fact.displayValue}${fact.sourceDocumentName ? ` · ${fact.sourceDocumentName}` : ''}`,
				score,
			})
		}
	}

	return hits
}

class VehiclesIntelligenceProvider implements ChronicleKnowledgeProvider {
	readonly id = PROVIDER_ID
	readonly domain = 'vehicles' as const
	readonly label = 'Vehicles'
	readonly priority = 12

	supports(query: KnowledgeProviderQuery): boolean {
		const knowledge = resolveVehicleKnowledge(query)
		return Boolean(knowledge && knowledge.documentCount > 0)
	}

	search(query: KnowledgeProviderQuery): SemanticSearchHit[] {
		const knowledge = resolveVehicleKnowledge(query)

		if (!knowledge) {
			return []
		}

		return searchVehicles({
			question: query.resolvedQuestion,
			knowledge,
		})
	}

	retrieveContext(query: KnowledgeProviderQuery): ProviderContextResult {
		const knowledge = resolveVehicleKnowledge(query)

		if (!knowledge || !knowledge.hasVehicles) {
			return {
				providerId: this.id,
				domain: this.domain,
				available: false,
				package: null,
				unavailableReason:
					'No vehicle documents are available for this family member yet.',
			}
		}

		return {
			providerId: this.id,
			domain: this.domain,
			available: true,
			package: {
				...createEmptyContextPackage(),
				summaryLines: knowledge.summary.lines,
			},
		}
	}
}

export const vehiclesIntelligenceProvider = new VehiclesIntelligenceProvider()

registerKnowledgeProvider(vehiclesIntelligenceProvider)
