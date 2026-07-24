import { C } from '@/constants/colors'
import type { ActionCardData } from '@/features/ask/types'

interface ActionCardProps {
	data: ActionCardData
}

export function ActionCard({ data }: ActionCardProps) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 14,
				padding: '14px 16px',
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				gap: 12,
			}}
		>
			<div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
				{data.title}
			</div>
			<span
				style={{
					fontSize: 11,
					fontWeight: 700,
					color: C.orange,
					background: `${C.orange}18`,
					borderRadius: 100,
					padding: '4px 10px',
					flexShrink: 0,
				}}
			>
				{data.dueLabel}
			</span>
		</div>
	)
}
