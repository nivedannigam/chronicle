import { C } from '@/constants/colors'
import type { HealthMetric, MetricStatus } from '@/features/health/types'

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

interface MetricRowProps {
	metric: HealthMetric
	isLast: boolean
}

export function MetricRow({ metric, isLast }: MetricRowProps) {
	const color = statusColor(metric.status)

	return (
		<div
			style={{
				padding: '14px 16px',
				borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 6,
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
				<span style={{ fontSize: 12, color: C.textMuted }}>
					Ref: {metric.reference}
				</span>
			</div>
		</div>
	)
}

interface MetricsListProps {
	metrics: HealthMetric[]
}

export function MetricsList({ metrics }: MetricsListProps) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 18,
				overflow: 'hidden',
			}}
		>
			{metrics.map((metric, index) => (
				<MetricRow
					key={metric.name}
					metric={metric}
					isLast={index === metrics.length - 1}
				/>
			))}
		</div>
	)
}
