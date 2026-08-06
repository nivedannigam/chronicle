import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import { buildIntelligenceSources } from '@chronicle/core-search'

export function buildPlatformIntelligenceSources(input: {
	uploadedReports?: unknown[]
	storedMetrics?: unknown[]
	connectorDocuments?: unknown[]
	documents?: unknown[]
	insuranceKnowledge?: InsuranceKnowledge | null
	insuranceRawData?: InsuranceKnowledgeRawData
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

	return sources
}
