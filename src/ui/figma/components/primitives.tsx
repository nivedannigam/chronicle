import type { CSSProperties, ReactNode } from 'react'
import { C } from '@/constants/colors'

export function FigmaCard({
	children,
	style,
}: {
	children: ReactNode
	style?: CSSProperties
}) {
	return (
		<div
			style={{
				background: C.card,
				borderRadius: 18,
				overflow: 'hidden',
				border: `1px solid ${C.border}`,
				...style,
			}}
		>
			{children}
		</div>
	)
}

export function FigmaSectionLabel({ children }: { children: ReactNode }) {
	return (
		<div
			style={{
				fontSize: 11,
				fontWeight: 600,
				letterSpacing: '0.09em',
				textTransform: 'uppercase',
				color: C.textMuted,
				marginBottom: 12,
			}}
		>
			{children}
		</div>
	)
}

export function FigmaAvatar({
	initials,
	bg,
	size = 44,
}: {
	initials: string
	bg: string
	size?: number
}) {
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: size / 2,
				background: bg,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
				fontSize: size * 0.3,
				fontWeight: 700,
				color: '#fff',
				letterSpacing: '-0.02em',
			}}
		>
			{initials}
		</div>
	)
}

export function FigmaNavBadge({ count }: { count: string }) {
	return (
		<div
			style={{
				position: 'absolute',
				top: -2,
				right: -2,
				background: C.accentBlue,
				borderRadius: 100,
				minWidth: 16,
				height: 16,
				padding: '0 4px',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				fontSize: 9,
				fontWeight: 700,
				color: '#fff',
				letterSpacing: '-0.02em',
				border: `1.5px solid ${C.bg}`,
			}}
		>
			{count}
		</div>
	)
}

export function FigmaPriorityPill({
	score,
	category,
}: {
	score: number
	category: string
}) {
	const color =
		score >= 90
			? C.red
			: score >= 70
				? C.orange
				: category === 'Travel'
					? 'rgba(255,255,255,0.18)'
					: C.orange

	const textColor =
		score >= 90
			? '#fff'
			: score >= 70
				? '#fff'
				: category === 'Travel'
					? C.textSec
					: '#fff'

	return (
		<div
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				background: color,
				borderRadius: 100,
				padding: '3px 10px',
				fontSize: 12,
				fontWeight: 700,
				color: textColor,
				gap: 2,
			}}
		>
			P{score} · {category}
		</div>
	)
}

export function FigmaTag({
	label,
	color,
	bg,
}: {
	label: string
	color: string
	bg: string
}) {
	return (
		<span
			style={{
				fontSize: 11,
				fontWeight: 600,
				color,
				background: bg,
				borderRadius: 100,
				padding: '2px 9px',
				display: 'inline-block',
			}}
		>
			{label}
		</span>
	)
}

export function FigmaCircProgress({ pct }: { pct: number }) {
	const r = 26
	const cx = 32
	const cy = 32
	const circ = 2 * Math.PI * r
	const offset = circ - (pct / 100) * circ

	return (
		<svg width={64} height={64} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
			<circle
				cx={cx}
				cy={cy}
				r={r}
				fill="none"
				stroke="rgba(255,255,255,0.08)"
				strokeWidth={5}
			/>
			<circle
				cx={cx}
				cy={cy}
				r={r}
				fill="none"
				stroke={C.accent}
				strokeWidth={5}
				strokeDasharray={circ}
				strokeDashoffset={offset}
				strokeLinecap="round"
				transform={`rotate(-90 ${cx} ${cy})`}
			/>
			<text
				x={cx}
				y={cy + 1}
				textAnchor="middle"
				dominantBaseline="middle"
				fill="white"
				fontSize="11"
				fontWeight="700"
				fontFamily="system-ui"
			>
				{pct}%
			</text>
		</svg>
	)
}

export function FigmaStatusSquare({
	color,
	done,
}: {
	color: string
	done?: boolean
}) {
	return (
		<div
			style={{
				width: 20,
				height: 20,
				borderRadius: 6,
				flexShrink: 0,
				background: done ? `${C.teal}28` : `${color}1A`,
				border: `1.5px solid ${done ? C.teal : color}`,
				position: 'relative',
			}}
		>
			{done ? (
				<div
					style={{
						position: 'absolute',
						inset: 3,
						background: C.teal,
						borderRadius: 3,
					}}
				/>
			) : null}
		</div>
	)
}
