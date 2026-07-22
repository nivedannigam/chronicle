import { C } from '@/constants/colors'
import type { TrendSeries } from '@/features/health/types'

interface TrendChartProps {
	series: TrendSeries
}

export function TrendChart({ series }: TrendChartProps) {
	const width = 300
	const height = 100
	const padX = 8
	const padY = 12
	const values = series.values

	if (values.length < 2) {
		return null
	}

	const numericValues = values.map((point) => point.value)
	const min = Math.min(...numericValues)
	const max = Math.max(...numericValues)
	const range = max - min || 1

	const points = values
		.map((point, index) => {
			const x = padX + (index / (values.length - 1)) * (width - padX * 2)
			const y =
				height - padY - ((point.value - min) / range) * (height - padY * 2)
			return `${x},${y}`
		})
		.join(' ')

	const latest = values[values.length - 1]

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 18,
				padding: '16px',
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'baseline',
					marginBottom: 12,
				}}
			>
				<div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
					{series.name}
				</div>
				<div style={{ fontSize: 13, color: series.color, fontWeight: 600 }}>
					{latest.value} {series.unit}
				</div>
			</div>
			<svg
				width="100%"
				viewBox={`0 0 ${width} ${height}`}
				style={{ display: 'block' }}
			>
				<polyline
					fill="none"
					stroke={series.color}
					strokeWidth={2.5}
					strokeLinecap="round"
					strokeLinejoin="round"
					points={points}
				/>
				{values.map((point, index) => {
					const x = padX + (index / (values.length - 1)) * (width - padX * 2)
					const y =
						height - padY - ((point.value - min) / range) * (height - padY * 2)

					return (
						<circle
							key={point.date}
							cx={x}
							cy={y}
							r={3.5}
							fill={series.color}
						/>
					)
				})}
			</svg>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					marginTop: 8,
				}}
			>
				{values.map((point) => (
					<span key={point.date} style={{ fontSize: 10, color: C.textMuted }}>
						{point.label}
					</span>
				))}
			</div>
		</div>
	)
}

interface TrendChartGridProps {
	series: TrendSeries[]
}

export function TrendChartGrid({ series }: TrendChartGridProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			{series.map((item) => (
				<TrendChart key={item.id} series={item} />
			))}
		</div>
	)
}
