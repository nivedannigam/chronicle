import { C } from '@/constants/colors'

export function AskStreamingSkeleton() {
	return (
		<div
			aria-hidden
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 8,
				marginBottom: 12,
			}}
		>
			{[88, 72, 96, 56].map((width, index) => (
				<div
					key={index}
					style={{
						height: 12,
						width: `${width}%`,
						borderRadius: 6,
						background: C.card2,
						animation: 'ask-pulse 1.4s ease-in-out infinite',
						animationDelay: `${index * 0.12}s`,
					}}
				/>
			))}
		</div>
	)
}
