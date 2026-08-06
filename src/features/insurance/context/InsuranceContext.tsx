import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from '@/features/auth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { resolveMemberDisplayName } from '@/features/family/utils/member-display'
import { useInsuranceKnowledge } from '@/features/insurance/hooks/useInsuranceKnowledge'
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

	const value = useMemo(() => {
		const resolvedKnowledge =
			knowledge ??
			insuranceKnowledgeProvider.buildFromRawData(emptyRawData(), {
				userId: user?.id ?? '',
				familyMemberId: selectedMember?.id ?? null,
				accountOwnerMemberId: accountOwnerMemberId ?? null,
			})

		return buildInsuranceContextValue({
			knowledge: resolvedKnowledge,
			memberName,
			isLoading,
			isError,
			refetch: () => void refetch(),
		})
	}, [
		knowledge,
		memberName,
		isLoading,
		isError,
		refetch,
		user?.id,
		selectedMember?.id,
		accountOwnerMemberId,
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
