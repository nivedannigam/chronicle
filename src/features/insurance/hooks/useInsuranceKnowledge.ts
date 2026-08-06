import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { insuranceKnowledgeProvider } from '@/features/insurance-knowledge'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useInsuranceKnowledge() {
	const { user } = useAuth()
	const { selectedMember, accountOwnerMemberId } = useFamilyContext()
	const userId = user?.id

	const query = useQuery({
		queryKey: queryKeys.insurance.knowledge(userId, selectedMember?.id ?? null),
		queryFn: () =>
			insuranceKnowledgeProvider.getKnowledge({
				userId: userId!,
				familyMemberId: selectedMember?.id ?? null,
				accountOwnerMemberId: accountOwnerMemberId ?? null,
			}),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.insuranceKnowledge,
	})

	return {
		knowledge: query.data ?? null,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch,
	}
}
