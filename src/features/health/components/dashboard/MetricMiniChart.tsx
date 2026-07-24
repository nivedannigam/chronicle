import { C } from '@/constants/colors'
import type { HealthObservation } from '@/features/health-knowledge/types'

interface MetricMiniChartProps {
	observations: HealthObservation[]
	color?: string
	height?: number
}

export function MetricMiniChart({
	observations,
	color = C.accent,
	height = 48,
}: MetricMiniChartProps) {
	const points = observations
		.filter((obs) => obs.numericValue != null)
		.sort((a, b) => Date.parse(a.observedAt) - Date.parse(b.observedAt))

	if (points.length < 2) {
		return (
			<div
				style={{
					height,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: 10,
					color: C.textMuted,
				}}
			>
				Need 2+ readings
			</div>
		)
	}

	const width = 120
	const padX = 4
	const padY = 6
	const values = points.map((p) => p.numericValue!)
	const min = Math.min(...values)
	const max = Math.max(...values)
	const range = max - min || 1

	const polyline = values
		.map((value, index) => {
			const x = padX + (index / (values.length - 1)) * (width - padX * 2)
			const y = height - padY - ((value - min) / range) * (height - padY * 2)
			return `${x},${y}`
		})
		.join(' ')

	return (
		<svg
			width="100%"
			viewBox={`0 0 ${width} ${height}`}
			style={{ display: 'block' }}
		>
			<polyline
				fill="none"
				stroke={color}
				strokeWidth={2}
				strokeLinecap="round"
				strokeLinejoin="round"
				points={polyline}
			/>
			{values.map((value, index) => {
				const x = padX + (index / (values.length - 1)) * (width - padX * 2)
				const y = height - padY - ((value - min) / range) * (height - padY * 2)
				return <circle key={index} cx={x} cy={y} r={2.5} fill={color} />
			})}
		</svg>
	)
}
