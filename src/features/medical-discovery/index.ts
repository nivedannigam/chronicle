export { DiscoveryDashboardPage } from '@/features/medical-discovery/pages/DiscoveryDashboardPage'
export { ImportReviewPage } from '@/features/medical-discovery/pages/ImportReviewPage'
export { OcrPreviewPage } from '@/features/medical-discovery/pages/OcrPreviewPage'
export { useMedicalDiscovery } from '@/features/medical-discovery/hooks/useMedicalDiscovery'
export { useImportReview } from '@/features/medical-discovery/hooks/useImportReview'
export {
	runMedicalDiscovery,
	getDiscoveryDashboardStats,
} from '@/features/medical-discovery/services/medical-discovery-engine.service'
export { scoreMedicalFile } from '@/features/medical-discovery/services/medical-scoring.service'
export {
	processApprovedImports,
	queueApprovedImports,
	resetFailedImportCandidates,
} from '@/features/medical-discovery/services/import-pipeline.service'
export type {
	DiscoveryCategory,
	ScoredMedicalFile,
	ReviewDocument,
	ImportPipelineSummary,
} from '@/features/medical-discovery/types/medical-discovery.types'
