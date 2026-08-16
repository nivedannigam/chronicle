import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import type { VehicleKnowledgeRawData } from '@/features/vehicle-knowledge/providers/vehicle-knowledge-data-source'
import { buildIntelligenceSources } from '@chronicle/core-search'

export function buildPlatformIntelligenceSources(input: {
	uploadedReports?: unknown[]
	storedMetrics?: unknown[]
	connectorDocuments?: unknown[]
	documents?: unknown[]
	insuranceKnowledge?: InsuranceKnowledge | null
	insuranceRawData?: InsuranceKnowledgeRawData
	vehicleKnowledge?: VehicleKnowledge | null
	vehicleRawData?: VehicleKnowledgeRawData
	userId?: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
}): Record<string, unknown> {
	const sources = buildIntelligenceSources({
		uploadedReports: input.uploadedReports,
		storedMetrics: input.storedMetrics,
		connectorDocuments: input.connectorDocuments,
		documents: input.documents,
	})

	if (input.insuranceKnowledge) {
		sources.insurance = {
			knowledge: input.insuranceKnowledge,
		}
	} else if (input.insuranceRawData && input.userId) {
		sources.insurance = {
			rawData: input.insuranceRawData,
			userId: input.userId,
			familyMemberId: input.familyMemberId ?? null,
			accountOwnerMemberId: input.accountOwnerMemberId ?? null,
		}
	}

	if (input.vehicleKnowledge) {
		sources.vehicles = {
			knowledge: input.vehicleKnowledge,
		}
	} else if (input.vehicleRawData && input.userId) {
		sources.vehicles = {
			rawData: input.vehicleRawData,
			userId: input.userId,
			familyMemberId: input.familyMemberId ?? null,
			accountOwnerMemberId: input.accountOwnerMemberId ?? null,
		}
	}

	return sources
}
