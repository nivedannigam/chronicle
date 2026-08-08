import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceHomeViewModel } from '@/features/insurance/services/insurance-home.mapper'
import type {
	PoliciesListViewModel,
	PolicyDetailViewModel,
} from '@/features/insurance/services/insurance-policies.mapper'
import type {
	ClaimsDashboardViewModel,
	ClaimDetailViewModel,
} from '@/features/insurance/services/insurance-claims.mapper'
import type { InsuranceTimelineViewModel } from '@/features/insurance/services/insurance-timeline.mapper'
import type { ProtectionOverviewViewModel } from '@/features/insurance/services/insurance-protection.mapper'

export type InsuranceSetupStatus =
	| 'connect_drive'
	| 'assign_folder'
	| 'scanning'
	| 'processing'
	| 'partial'
	| 'ready'
	| 'empty_folder'

export interface InsuranceContextValue {
	knowledge: InsuranceKnowledge
	home: InsuranceHomeViewModel
	protection: ProtectionOverviewViewModel
	policies: PoliciesListViewModel
	claims: ClaimsDashboardViewModel
	timeline: InsuranceTimelineViewModel
	getPolicyDetail: (policyId: string) => PolicyDetailViewModel | null
	getClaimDetail: (claimId: string) => ClaimDetailViewModel | null
	hasPolicies: boolean
	hasClaims: boolean
	hasFolderAssigned: boolean
	hasDiscoveredDocuments: boolean
	isProcessing: boolean
	processingCount: number
	setupStatus: InsuranceSetupStatus
	isLoading: boolean
	isError: boolean
	refetch: () => void
}
