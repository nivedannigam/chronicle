import { C } from '@/constants/colors'

interface TimelineGroupHeaderProps {
	label: string
}

export function TimelineGroupHeader({ label }: TimelineGroupHeaderProps) {
	return (
		<div
			style={{
				position: 'sticky',
				top: 0,
				zIndex: 1,
				padding: '10px 4px 8px',
				background:
					'linear-gradient(180deg, var(--page-bg, #0b0d10) 70%, transparent)',
				fontSize: 12,
				fontWeight: 800,
				letterSpacing: '0.08em',
				textTransform: 'uppercase',
				color: C.textMuted,
			}}
		>
			{label}
		</div>
	)
}
