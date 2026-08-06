import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useAuth } from '@/features/auth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { resolveMemberDisplayName } from '@/features/family/utils/member-display'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { useHealthMetrics } from '@/features/health/hooks/useHealthMetrics'
import { buildHealthContextValue } from '@/features/health/services/health-context.builder'
import type { HealthContextValue } from '@/features/health/types/health-context.types'

const HealthContext = createContext<HealthContextValue | null>(null)

export function HealthProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth()
	const { selectedMember } = useFamilyContext()
	const companionState = useHealthCompanion()
	const metricsQuery = useHealthMetrics()
	const storedMetrics = metricsQuery.data

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

	const value = useMemo(
		() =>
			buildHealthContextValue({
				companion: companionState.companion,
				graph: companionState.knowledgeGraph,
				coverage: companionState.coverage,
				reports: companionState.reports,
				trendSeries: companionState.trendSeries,
				hasImportedReports: companionState.hasImportedReports,
				memberName,
				storedMetrics: storedMetrics ?? [],
				isLoading: companionState.isLoading || metricsQuery.isLoading,
				isError: companionState.isError,
				refetch: companionState.refetch,
			}),
		[companionState, memberName, storedMetrics, metricsQuery.isLoading],
	)

	return (
		<HealthContext.Provider value={value}>{children}</HealthContext.Provider>
	)
}

export function useHealthContext(): HealthContextValue {
	const context = useContext(HealthContext)

	if (!context) {
		throw new Error('useHealthContext must be used within HealthProvider')
	}

	return context
}

/** Safe hook for pages outside HealthLayout (e.g. Report Detail). */
export function useHealthContextOptional(): HealthContextValue | null {
	return useContext(HealthContext)
}
