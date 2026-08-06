export { insuranceKnowledgeService } from '@/features/insurance-knowledge/services/insurance-knowledge.service'
export { invalidateInsuranceKnowledgeCache } from '@/features/insurance-knowledge/services/insurance-knowledge-cache'
export {
	buildInsuranceKnowledgeGraph,
	buildInsuranceKnowledgeSourceKey,
	insuranceKnowledgeGraphBuilder,
	isPolicyDisplayReady,
	isPolicyExpiringSoon,
	isPolicyActive,
} from '@/features/insurance-knowledge/services/insurance-knowledge-builder'
export { mergeInsuranceRecords } from '@/features/insurance-knowledge/services/merge-insurance-records'
export { computeProtectionScoreFromHistories } from '@/features/insurance-knowledge/services/insurance-scoring.service'
export {
	InsuranceKnowledgeProvider,
	insuranceKnowledgeProvider,
	insuranceKnowledgeToPayload,
} from '@/features/insurance-knowledge/providers/insurance-knowledge.provider'
export type {
	InsuranceKnowledgeDataSource,
	InsuranceKnowledgeRawData,
} from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
export {
	defaultInsuranceKnowledgeDataSource,
	filterRawDataForMember,
} from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
export type * from '@/features/insurance-knowledge/types'
