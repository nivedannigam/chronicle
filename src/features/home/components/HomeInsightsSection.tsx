import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { HealthInsightsList } from '@/features/health/components/HealthInsightsList'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'
import type { HomeBriefing } from '@/features/home/types/home.types'

interface HomeInsightsSectionProps {
	briefing: HomeBriefing
}

export function HomeInsightsSection({ briefing }: HomeInsightsSectionProps) {
	const navigate = useNavigate()

	if (briefing.isLoading || briefing.proactiveInsights.length === 0) {
		return null
	}

	return (
		<section style={{ marginBottom: 28 }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 12,
				}}
			>
				<HomeSectionLabel>Insights</HomeSectionLabel>
				<button
					type="button"
					onClick={() => navigate(ROUTES.healthInsights)}
					style={{
						background: 'none',
						border: 'none',
						padding: 0,
						fontSize: 12,
						fontWeight: 600,
						color: C.teal,
						cursor: 'pointer',
						fontFamily: 'inherit',
						display: 'flex',
						alignItems: 'center',
						gap: 2,
					}}
				>
					View all
					<ChevronRight size={14} />
				</button>
			</div>

			<HealthInsightsList insights={briefing.proactiveInsights.slice(0, 5)} />
		</section>
	)
}
