import { C } from '@/constants/colors'
import type { HealthMetric, MetricStatus } from '@/features/health/types'
import { FigmaCard } from '@/ui/figma/components/primitives'

function statusColor(status: MetricStatus): string {
	switch (status) {
		case 'low':
		case 'high':
			return C.orange
		case 'critical':
			return C.red
		default:
			return C.greenAlt
	}
}

function statusLabel(status: MetricStatus): string {
	switch (status) {
		case 'low':
			return 'Low'
		case 'high':
			return 'High'
		case 'critical':
			return 'Critical'
		default:
			return 'Normal'
	}
}

interface ExtractedMetricsListProps {
	metrics: HealthMetric[]
}

export function ExtractedMetricsList({ metrics }: ExtractedMetricsListProps) {
	if (metrics.length === 0) {
		return (
			<FigmaCard style={{ padding: '16px', fontSize: 14, color: C.textMuted }}>
				No results available for this visit yet.
			</FigmaCard>
		)
	}

	return (
		<FigmaCard>
			{metrics.map((metric, index) => {
				const color = statusColor(metric.status)
				const isAbnormal = metric.status !== 'normal'

				return (
					<div
						key={`${metric.name}-${index}`}
						style={{
							padding: '14px 16px',
							borderBottom:
								index < metrics.length - 1 ? `1px solid ${C.border}` : 'none',
							background: isAbnormal ? `${color}08` : 'transparent',
						}}
					>
						<div
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								marginBottom: 6,
								gap: 12,
							}}
						>
							<span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>
								{metric.name}
							</span>
							<span
								style={{
									fontSize: 11,
									fontWeight: 700,
									color,
									background: `${color}18`,
									borderRadius: 100,
									padding: '3px 9px',
								}}
							>
								{statusLabel(metric.status)}
							</span>
						</div>
						<div
							style={{
								display: 'flex',
								alignItems: 'baseline',
								justifyContent: 'space-between',
								gap: 12,
							}}
						>
							<span
								style={{
									fontSize: 18,
									fontWeight: 700,
									color: C.text,
									letterSpacing: '-0.02em',
								}}
							>
								{metric.value}
							</span>
							{metric.reference ? (
								<span style={{ fontSize: 12, color: C.textMuted }}>
									Reference: {metric.reference}
								</span>
							) : null}
						</div>
					</div>
				)
			})}
		</FigmaCard>
	)
}
