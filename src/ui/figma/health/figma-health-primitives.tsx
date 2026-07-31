import type { ReactNode } from 'react'
import { FC } from '@/ui/figma/tokens/figma-v2-tokens'
import { figmaCardStyle } from '@/ui/figma/v2/atoms'

export function FigmaHealthRing({
	score,
	color = FC.green,
}: {
	score: number | null
	color?: string
}) {
	const size = 144
	const center = 72
	const radius = 56
	const strokeWidth = 8
	const circumference = 2 * Math.PI * radius
	const displayScore = score ?? null
	const offset =
		displayScore === null
			? circumference
			: circumference - (displayScore / 100) * circumference

	return (
		<div
			style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}
		>
			<svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
				<circle
					cx={center}
					cy={center}
					r={radius}
					fill="none"
					stroke={`${color}18`}
					strokeWidth={strokeWidth}
				/>
				<circle
					cx={center}
					cy={center}
					r={radius}
					fill="none"
					stroke={color}
					strokeWidth={strokeWidth}
					strokeDasharray={circumference}
					strokeDashoffset={offset}
					strokeLinecap="round"
				/>
			</svg>
			<div
				style={{
					position: 'absolute',
					inset: 0,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 2,
				}}
			>
				<span
					style={{
						color: FC.fg,
						fontSize: 32,
						fontWeight: 700,
						letterSpacing: -1.5,
						lineHeight: 1,
					}}
				>
					{displayScore ?? '—'}
				</span>
				<span
					style={{
						color: FC.dim,
						fontSize: 11,
						fontWeight: 500,
						letterSpacing: '0.04em',
						textTransform: 'uppercase',
					}}
				>
					Score
				</span>
			</div>
		</div>
	)
}

export function FigmaHealthSectionLabel({ children }: { children: ReactNode }) {
	return (
		<span
			style={{
				color: 'rgba(255,255,255,0.28)',
				fontSize: 11,
				fontWeight: 600,
				letterSpacing: '0.09em',
				textTransform: 'uppercase',
			}}
		>
			{children}
		</span>
	)
}

export function FigmaSparkline({
	data,
	color,
}: {
	data: number[]
	color: string
}) {
	const width = 52
	const height = 22
	const min = Math.min(...data)
	const max = Math.max(...data)
	const range = max - min || 1
	const points = data.map((value, index) => [
		(index / (data.length - 1)) * width,
		height - ((value - min) / range) * (height - 5) - 2,
	])
	const path = points
		.map(
			(point, index) =>
				`${index === 0 ? 'M' : 'L'}${point[0].toFixed(1)},${point[1].toFixed(1)}`,
		)
		.join(' ')
	const last = points[points.length - 1]

	return (
		<svg width={width} height={height} style={{ overflow: 'visible' }}>
			<path
				d={path}
				fill="none"
				stroke={color}
				strokeWidth={1.6}
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity={0.8}
			/>
			<circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
		</svg>
	)
}

export function FigmaMiniHealthRing({
	score,
	color,
	label,
}: {
	score: number
	color: string
	label: string
}) {
	const size = 40
	const radius = 16
	const circumference = 2 * Math.PI * radius

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				gap: 5,
			}}
		>
			<div style={{ position: 'relative', width: size, height: size }}>
				<svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
					<circle
						cx={20}
						cy={20}
						r={radius}
						fill="none"
						stroke={`${color}18`}
						strokeWidth={3.5}
					/>
					<circle
						cx={20}
						cy={20}
						r={radius}
						fill="none"
						stroke={color}
						strokeWidth={3.5}
						strokeDasharray={circumference}
						strokeDashoffset={circumference * (1 - score / 100)}
						strokeLinecap="round"
					/>
				</svg>
				<span
					style={{
						position: 'absolute',
						inset: 0,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						color: FC.fg,
						fontSize: 10,
						fontWeight: 700,
					}}
				>
					{score}
				</span>
			</div>
			<span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10.5 }}>
				{label}
			</span>
		</div>
	)
}

export function FigmaHealthTrendChart({
	series,
}: {
	series: import('@/features/health/types').TrendSeries
}) {
	const points = series.values
	if (points.length < 2) return null

	const width = 280
	const height = 72
	const padding = 8
	const values = points.map((point) => point.value)
	const min = Math.min(...values)
	const max = Math.max(...values)
	const range = max - min || 1
	const stepX = (width - padding * 2) / (points.length - 1)
	const path = points
		.map((point, index) => {
			const x = padding + index * stepX
			const y =
				height -
				padding -
				((point.value - min) / range) * (height - padding * 2)
			return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
		})
		.join(' ')

	const latest = points[points.length - 1]
	const first = points[0]
	const delta = latest.value - first.value
	const trendColor =
		series.color || (delta > 0 ? FC.orange : delta < 0 ? FC.green : FC.blue)

	return (
		<div style={{ ...figmaCardStyle, padding: '14px 16px' }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					gap: 12,
					marginBottom: 10,
				}}
			>
				<div>
					<p
						style={{
							margin: 0,
							color: FC.fg,
							fontSize: 14,
							fontWeight: 600,
						}}
					>
						{series.name}
					</p>
					<p
						style={{
							margin: '4px 0 0',
							color: 'rgba(255,255,255,0.42)',
							fontSize: 11.5,
						}}
					>
						{points.length} readings · {series.unit}
					</p>
				</div>
				<div style={{ textAlign: 'right' }}>
					<p
						style={{
							margin: 0,
							color: FC.fg,
							fontSize: 16,
							fontWeight: 700,
						}}
					>
						{latest.value} {series.unit}
					</p>
					<p
						style={{
							margin: '2px 0 0',
							color: trendColor,
							fontSize: 11,
							fontWeight: 600,
						}}
					>
						{delta > 0 ? '+' : ''}
						{delta.toFixed(1)} vs first
					</p>
				</div>
			</div>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				style={{ width: '100%', height: 72, display: 'block' }}
				aria-hidden
			>
				<path
					d={path}
					fill="none"
					stroke={trendColor}
					strokeWidth={2.5}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				{points.map((point, index) => {
					const x = padding + index * stepX
					const y =
						height -
						padding -
						((point.value - min) / range) * (height - padding * 2)
					return (
						<circle
							key={`${point.date}-${index}`}
							cx={x}
							cy={y}
							r={3}
							fill={trendColor}
						/>
					)
				})}
			</svg>
		</div>
	)
}
