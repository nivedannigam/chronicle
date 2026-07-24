import { C } from '@/constants/colors'
import type { AlertCardData } from '@/features/ask/types'

interface AlertCardProps {
	data: AlertCardData
}

export function AlertCard({ data }: AlertCardProps) {
	const color =
		data.severity === 'critical'
			? C.red
			: data.severity === 'attention'
				? C.orange
				: C.textSec

	return (
		<div
			style={{
				background: C.card2,
				border: `1px solid ${color}44`,
				borderRadius: 14,
				padding: '12px 14px',
			}}
		>
			<div
				style={{
					fontSize: 11,
					fontWeight: 700,
					color,
					textTransform: 'uppercase',
					letterSpacing: '0.06em',
					marginBottom: 6,
				}}
			>
				{data.severity}
			</div>
			<div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
				{data.message}
			</div>
		</div>
	)
}
