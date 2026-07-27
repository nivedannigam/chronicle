import type { ReactNode } from 'react'
import { FC } from '@/ui/figma/tokens/figma-v2-tokens'

export function FigmaHealthRing({
	score,
	color = FC.green,
}: {
	score: number
	color?: string
}) {
	const size = 144
	const center = 72
	const radius = 56
	const strokeWidth = 8
	const circumference = 2 * Math.PI * radius
	const offset = circumference - (score / 100) * circumference

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
					{score}
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

export function figmaHealthScoreColor(score: number | null): string {
	if (score === null) return FC.blue
	if (score >= 85) return FC.green
	if (score >= 70) return FC.amber
	return FC.orange
}

export function figmaHealthStatusHeadline(
	status: import('@/features/health/types/health-companion.types').HealthStatusLabel,
): string {
	switch (status) {
		case 'Looking Good':
			return "You're in good health."
		case 'Improving':
			return "You're trending in the right direction."
		case 'Monitoring Required':
			return 'A few markers need watching.'
		default:
			return 'Some results need your attention.'
	}
}

export function figmaMetricStatusColor(status: string): string {
	if (status === 'normal') return FC.green
	if (status === 'critical' || status === 'high') return FC.orange
	if (status === 'low' || status === 'borderline') return FC.amber
	return FC.green
}

export function figmaMetricStatusLabel(
	status: string,
	trendLabel?: string,
): string {
	if (trendLabel) return trendLabel
	if (status === 'normal') return 'Normal'
	if (status === 'low') return 'Low ↓'
	if (status === 'high') return 'Slightly high ↑'
	if (status === 'critical') return 'Above range ↑'
	if (status === 'borderline') return 'Borderline'
	return 'Tracked'
}

export function figmaJourneyEventColor(
	kind: import('@/features/health/types/health-companion.types').HealthJourneyEvent['kind'],
): string {
	switch (kind) {
		case 'finding':
		case 'review':
			return FC.amber
		case 'monitoring':
			return FC.blue
		default:
			return FC.green
	}
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
