import type { CSSProperties, ReactNode } from 'react'
import { FC } from '@/ui/figma/tokens/figma-v2-tokens'

export function FigmaHomeLabel({ children }: { children: ReactNode }) {
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

export function FigmaMemberAvatar({
	initial,
	color,
	size = 44,
}: {
	initial: string
	color: string
	size?: number
}) {
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: size / 2,
				background: `linear-gradient(135deg,${color}35,${color}18)`,
				border: `1.5px solid ${color}38`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				flexShrink: 0,
			}}
		>
			<span style={{ color, fontSize: size * 0.36, fontWeight: 700 }}>
				{initial}
			</span>
		</div>
	)
}

export function memberInitial(displayName: string): string {
	const trimmed = displayName.trim()
	return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

export function memberFirstName(displayName: string): string {
	return displayName.trim().split(/\s+/)[0] || displayName
}

export const figmaHomeCardStyle: CSSProperties = {
	background: FC.surface,
	border: `1px solid ${FC.line}`,
	borderRadius: 24,
	boxShadow:
		'0 4px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.045)',
}
