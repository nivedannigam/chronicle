import { C } from '@/constants/colors'

interface TypingIndicatorProps {
	label?: string
}

export function TypingIndicator({
	label = 'Chronicle is reviewing your records…',
}: TypingIndicatorProps) {
	return (
		<div
			role="status"
			aria-live="polite"
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				padding: '4px 0 8px',
			}}
		>
			<div style={{ display: 'flex', gap: 5 }}>
				{[0, 1, 2].map((index) => (
					<span
						key={index}
						className="ask-typing-dot"
						style={{
							width: 7,
							height: 7,
							borderRadius: '50%',
							background: C.accent,
							animation: 'ask-bounce 1.2s ease-in-out infinite',
							animationDelay: `${index * 0.15}s`,
						}}
					/>
				))}
			</div>
			<span style={{ fontSize: 13, color: C.textMuted }}>{label}</span>
		</div>
	)
}
