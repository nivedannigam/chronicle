import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from '@/features/auth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { resolveMemberDisplayName } from '@/features/family/utils/member-display'
import { useInsuranceKnowledge } from '@/features/insurance/hooks/useInsuranceKnowledge'
import { useInsuranceMemberSetup } from '@/features/insurance/hooks/useInsuranceMemberSetup'
import { buildInsuranceContextValue } from '@/features/insurance/services/insurance-context.builder'
import type { InsuranceContextValue } from '@/features/insurance/types/insurance-context.types'
import { insuranceKnowledgeProvider } from '@/features/insurance-knowledge'
import type { InsuranceKnowledgeRawData } from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'

const InsuranceContext = createContext<InsuranceContextValue | null>(null)

function emptyRawData(): InsuranceKnowledgeRawData {
	return {
		policies: [],
		coverages: [],
		members: [],
		nominees: [],
		premiums: [],
		renewals: [],
		claims: [],
		benefits: [],
		exclusions: [],
		documents: [],
		insurers: [],
		familyMembers: [],
		importRegistry: [],
	}
}

export function InsuranceProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth()
	const { selectedMember, accountOwnerMemberId } = useFamilyContext()
	const { knowledge, isLoading, isError, refetch } = useInsuranceKnowledge()

	const memberName = resolveMemberDisplayName({
		profileName:
			(typeof user?.user_metadata?.full_name === 'string'
				? user.user_metadata.full_name
				: null) ??
			(typeof user?.user_metadata?.name === 'string'
				? user.user_metadata.name
				: null),
		memberDisplayName: selectedMember?.displayName,
		isAccountOwner: selectedMember?.isAccountOwner,
	})

	const resolvedKnowledge =
		knowledge ??
		insuranceKnowledgeProvider.buildFromRawData(emptyRawData(), {
			userId: user?.id ?? '',
			familyMemberId: selectedMember?.id ?? null,
			accountOwnerMemberId: accountOwnerMemberId ?? null,
		})

	const setup = useInsuranceMemberSetup({
		hasPolicies: resolvedKnowledge.policies.some(
			(policy) => policy.isDisplayReady,
		),
		documentCount: resolvedKnowledge.documents.length,
	})

	const value = useMemo(() => {
		return buildInsuranceContextValue({
			knowledge: resolvedKnowledge,
			memberName,
			isLoading: isLoading || setup.isLoading,
			isError,
			refetch: () => void refetch(),
			setup: {
				hasFolderAssigned: setup.hasFolderAssigned,
				hasDiscoveredDocuments: setup.hasDiscoveredDocuments,
				isProcessing: setup.isProcessing,
				processingCount: setup.processingCount,
				setupStatus: setup.setupStatus,
			},
		})
	}, [
		resolvedKnowledge,
		memberName,
		isLoading,
		setup.isLoading,
		setup.hasFolderAssigned,
		setup.hasDiscoveredDocuments,
		setup.isProcessing,
		setup.processingCount,
		setup.setupStatus,
		isError,
		refetch,
	])

	return (
		<InsuranceContext.Provider value={value}>
			{children}
		</InsuranceContext.Provider>
	)
}

export function useInsuranceContext(): InsuranceContextValue {
	const context = useContext(InsuranceContext)

	if (!context) {
		throw new Error('useInsuranceContext must be used within InsuranceProvider')
	}

	return context
}
