import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { ImportNotifications } from '@/features/health-import/components/ImportNotifications'
import {
	DashboardEmptyState,
	DashboardSkeleton,
} from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthSetupGuide } from '@/features/health/components/HealthSetupGuide'
import { useHealthCompanion } from '@/features/health/hooks/useHealthCompanion'
import { ROUTES } from '@/constants/routes'
import type { HealthKnowledgeGraph } from '@/features/health-knowledge/types'
import { FigmaHealthOverviewView } from '@/ui/figma/health/figma-health-views'

function buildMetricSparklines(
	graph: HealthKnowledgeGraph | null | undefined,
): Record<string, number[]> {
	if (!graph) return {}

	const map: Record<string, number[]> = {}

	for (const history of graph.profile.metricHistories) {
		const values = history.observations
			.map((observation) => observation.numericValue)
			.filter((value): value is number => value !== null)

		if (values.length >= 2) {
			map[history.canonicalMetricId] = values.slice(-6)
		}
	}

	return map
}

export function HealthOverviewPage() {
	const navigate = useNavigate()
	const { selectedMember } = useFamilyContext()
	const {
		companion,
		hasImportedReports,
		isLoading,
		isError,
		refetch,
		knowledgeGraph,
	} = useHealthCompanion()

	const metricSparklines = useMemo(
		() => buildMetricSparklines(knowledgeGraph),
		[knowledgeGraph],
	)

	if (isLoading) {
		return <DashboardSkeleton />
	}

	if (isError) {
		return (
			<DashboardEmptyState
				title="Could not load health data"
				message="Check your connection and try again."
				emoji="⚠️"
				actionLabel="Try again"
				onAction={() => void refetch()}
			/>
		)
	}

	if (!hasImportedReports) {
		return (
			<>
				<ImportNotifications />
				<HealthSetupGuide />
				<DashboardEmptyState
					title="Your health story starts here"
					message={`When reports are added for ${selectedMember?.displayName ?? 'this member'}, Chronicle will show how they are doing, what changed, and what needs attention.`}
					emoji="💚"
					onAction={() => navigate(ROUTES.healthSettings)}
				/>
			</>
		)
	}

	return (
		<>
			<ImportNotifications />
			<FigmaHealthOverviewView
				companion={companion}
				memberName={selectedMember?.displayName ?? null}
				metricSparklines={metricSparklines}
			/>
		</>
	)
}

/** @deprecated Use HealthOverviewPage */
export const HealthDashboardPage = HealthOverviewPage
