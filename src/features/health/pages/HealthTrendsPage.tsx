import { C } from '@/constants/colors'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { TrendChartGrid } from '@/features/health/components/TrendChart'
import { getTrendSeries } from '@/features/health/services/health.service'

export function HealthTrendsPage() {
	const series = getTrendSeries()

	return (
		<>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 22,
					lineHeight: 1.5,
				}}
			>
				Track how your key health markers change over time.
			</div>
			<HealthSectionHeader title="Trends" />
			<TrendChartGrid series={series} />
		</>
	)
}
