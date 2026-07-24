import { C } from '@/constants/colors'
import { MetricValueCard } from '@/features/health/components/dashboard/MetricValueCard'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import type { DashboardSectionConfig } from '@/features/health/config/dashboard-sections.config'
import type { HealthMetricHistory } from '@/features/health-knowledge/types'

interface DashboardMetricSectionProps {
	section: DashboardSectionConfig
	histories: HealthMetricHistory[]
	onViewTimeline?: (metricId: string) => void
}

export function DashboardMetricSection({
	section,
	histories,
	onViewTimeline,
}: DashboardMetricSectionProps) {
	if (histories.length === 0) {
		return (
			<DashboardEmptyState
				title={`No ${section.title} data`}
				message={section.emptyMessage}
				emoji={section.emoji}
			/>
		)
	}

	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: '1fr',
				gap: 10,
			}}
		>
			{histories.map((history) => (
				<MetricValueCard
					key={history.canonicalMetricId}
					history={history}
					onViewTimeline={onViewTimeline}
				/>
			))}
		</div>
	)
}

interface DashboardSectionHeaderProps {
	title: string
	emoji: string
	count?: number
}

export function DashboardSectionHeader({
	title,
	emoji,
	count,
}: DashboardSectionHeaderProps) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 8,
				marginBottom: 12,
				marginTop: 4,
			}}
		>
			<span style={{ fontSize: 18 }}>{emoji}</span>
			<div style={{ fontSize: 16, fontWeight: 800, color: C.text, flex: 1 }}>
				{title}
			</div>
			{count != null ? (
				<span style={{ fontSize: 11, fontWeight: 700, color: C.textMuted }}>
					{count} metric{count === 1 ? '' : 's'}
				</span>
			) : null}
		</div>
	)
}
