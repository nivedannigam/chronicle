import { C } from '@/constants/colors'

export function HomeSectionLabel({ children }: { children: string }) {
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
