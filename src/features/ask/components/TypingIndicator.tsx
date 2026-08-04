import { AskColors } from '@/ui/figma/ask/ask-design-tokens'

interface TypingIndicatorProps {
	/** When omitted, only the animated icon is shown. */
	label?: string | null
}

export function TypingIndicator({ label = null }: TypingIndicatorProps) {
	return (
		<div
			role="status"
			aria-live="polite"
			aria-label={label ?? 'Chronicle is reviewing your health records'}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 12,
				padding: '8px 0 12px',
			}}
		>
			<div
				className="ask-chronicle-pulse"
				style={{
					width: 32,
					height: 32,
					borderRadius: 10,
					background: AskColors.aiGradient,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
					animation: 'ask-pulse 2s ease-in-out infinite',
				}}
			>
				<span
					style={{
						fontSize: 14,
						fontWeight: 700,
						color: '#fff',
						lineHeight: 1,
					}}
				>
					C
				</span>
			</div>

			{label ? (
				<span
					style={{
						fontSize: 14,
						color: AskColors.mid,
						lineHeight: 1.45,
					}}
				>
					{label}
				</span>
			) : (
				<div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
					{[0, 1, 2].map((index) => (
						<span
							key={index}
							className="ask-typing-dot"
							style={{
								width: 6,
								height: 6,
								borderRadius: '50%',
								background: AskColors.primary,
								animation: 'ask-bounce 1.2s ease-in-out infinite',
								animationDelay: `${index * 0.15}s`,
							}}
						/>
					))}
				</div>
			)}
		</div>
	)
}
