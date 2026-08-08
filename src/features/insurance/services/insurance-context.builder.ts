import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import { buildInsuranceHomeViewModel } from '@/features/insurance/services/insurance-home.mapper'
import type { InsuranceSetupStatus } from '@/features/insurance/hooks/useInsuranceMemberSetup'
import {
	buildPoliciesListViewModel,
	buildPolicyDetailViewModel,
} from '@/features/insurance/services/insurance-policies.mapper'
import {
	buildClaimsDashboardViewModel,
	buildClaimDetailViewModel,
} from '@/features/insurance/services/insurance-claims.mapper'
import { buildInsuranceTimelineViewModel } from '@/features/insurance/services/insurance-timeline.mapper'
import { buildProtectionOverviewViewModel } from '@/features/insurance/services/insurance-protection.mapper'

export function buildInsuranceContextValue(input: {
	knowledge: InsuranceKnowledge
	memberName: string | null
	isLoading: boolean
	isError: boolean
	refetch: () => void
	setup: {
		hasFolderAssigned: boolean
		hasDiscoveredDocuments: boolean
		isProcessing: boolean
		processingCount: number
		setupStatus: InsuranceSetupStatus
	}
}) {
	const home = buildInsuranceHomeViewModel({
		knowledge: input.knowledge,
		memberName: input.memberName,
	})
	const protection = buildProtectionOverviewViewModel(input.knowledge)
	const policies = buildPoliciesListViewModel(input.knowledge)
	const claims = buildClaimsDashboardViewModel(input.knowledge)
	const timeline = buildInsuranceTimelineViewModel(input.knowledge)

	return {
		knowledge: input.knowledge,
		home,
		protection,
		policies,
		claims,
		timeline,
		getPolicyDetail: (policyId: string) =>
			buildPolicyDetailViewModel(input.knowledge, policyId),
		getClaimDetail: (claimId: string) =>
			buildClaimDetailViewModel(input.knowledge, claimId),
		hasPolicies: home.hasPolicies,
		hasClaims: claims.totalCount > 0,
		hasFolderAssigned: input.setup.hasFolderAssigned,
		hasDiscoveredDocuments: input.setup.hasDiscoveredDocuments,
		isProcessing: input.setup.isProcessing,
		processingCount: input.setup.processingCount,
		setupStatus: input.setup.setupStatus,
		isLoading: input.isLoading,
		isError: input.isError,
		refetch: input.refetch,
	}
}
