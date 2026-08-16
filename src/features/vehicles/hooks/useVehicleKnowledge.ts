import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { vehicleKnowledgeProvider } from '@/features/vehicle-knowledge'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export function useVehicleKnowledge() {
	const { user } = useAuth()
	const { selectedMember, accountOwnerMemberId } = useFamilyContext()
	const userId = user?.id

	const query = useQuery({
		queryKey: queryKeys.vehicles.knowledge(userId, selectedMember?.id ?? null),
		queryFn: () =>
			vehicleKnowledgeProvider.getKnowledge({
				userId: userId!,
				familyMemberId: selectedMember?.id ?? null,
				accountOwnerMemberId: accountOwnerMemberId ?? null,
			}),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.vehicleKnowledge,
	})

	return {
		knowledge: query.data ?? null,
		isLoading: query.isLoading,
		isError: query.isError,
		refetch: query.refetch,
	}
}
