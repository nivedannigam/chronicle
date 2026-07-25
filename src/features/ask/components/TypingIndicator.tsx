import { C } from '@/constants/colors'

interface TypingIndicatorProps {
	label?: string
}

export function TypingIndicator({
	label = 'Chronicle is reviewing your records…',
}: TypingIndicatorProps) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				padding: '4px 0 8px',
			}}
		>
			<div style={{ display: 'flex', gap: 4 }}>
				{[0, 1, 2].map((index) => (
					<span
						key={index}
						style={{
							width: 6,
							height: 6,
							borderRadius: '50%',
							background: C.accent,
							opacity: 0.45 + index * 0.15,
						}}
					/>
				))}
			</div>
			<span style={{ fontSize: 13, color: C.textMuted }}>{label}</span>
		</div>
	)
}
