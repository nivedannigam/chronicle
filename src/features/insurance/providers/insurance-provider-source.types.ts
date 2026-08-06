import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'

export interface InsuranceProviderSource {
	knowledge?: InsuranceKnowledge
	rawData?: InsuranceKnowledgeRawData
	userId?: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
}
