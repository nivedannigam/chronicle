import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { C } from '@/constants/colors'
import { healthMetricPath } from '@/constants/routes'
import { HealthSectionLabel } from '@/features/health/components/companion/health-section-label'
import type { MetricInsightGroup } from '@/features/health/types/health-companion.types'
import { FigmaCard } from '@/ui/figma/components/primitives'

interface HealthMetricInsightGroupsProps {
	groups: MetricInsightGroup[]
}

function statusLabel(status: MetricInsightGroup['status']): string {
	switch (status) {
		case 'improving':
			return 'Improving'
		case 'needs_attention':
			return 'Needs attention'
		default:
			return 'Stable'
	}
}

export function HealthMetricInsightGroups({
	groups,
}: HealthMetricInsightGroupsProps) {
	const navigate = useNavigate()

	if (groups.length === 0) {
		return null
	}

	return (
		<div style={{ display: 'grid', gap: 12 }}>
			{groups.map((group) => (
				<section key={group.id}>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'space-between',
							marginBottom: 10,
						}}
					>
						<HealthSectionLabel>{group.label}</HealthSectionLabel>
						<span
							style={{
								fontSize: 11,
								fontWeight: 700,
								color: group.color,
							}}
						>
							{statusLabel(group.status)}
						</span>
					</div>
					<FigmaCard>
						{group.metrics.map((metric, index) => (
							<button
								key={metric.id}
								type="button"
								onClick={() => navigate(healthMetricPath(metric.id))}
								style={{
									width: '100%',
									display: 'flex',
									alignItems: 'center',
									gap: 12,
									padding: '14px 16px',
									borderBottom:
										index === group.metrics.length - 1
											? 'none'
											: `1px solid ${C.border}`,
									background: 'transparent',
									border: 'none',
									borderBottomWidth: index === group.metrics.length - 1 ? 0 : 1,
									borderBottomStyle: 'solid',
									borderBottomColor: C.border,
									cursor: 'pointer',
									fontFamily: 'inherit',
									textAlign: 'left',
								}}
							>
								<div style={{ flex: 1, minWidth: 0 }}>
									<div style={{ fontSize: 14, fontWeight: 600 }}>
										{metric.name}
									</div>
									<div style={{ fontSize: 12, color: C.textMuted }}>
										{metric.trendLabel}
									</div>
								</div>
								<div style={{ fontSize: 14, fontWeight: 700 }}>
									{metric.value}
								</div>
								<ChevronRight size={16} color={C.textMuted} />
							</button>
						))}
					</FigmaCard>
				</section>
			))}
		</div>
	)
}
