import { C } from '@/constants/colors'
import type { SummaryCardData } from '@/features/ask/types'

interface SummaryCardProps {
	data: SummaryCardData
}

export function SummaryCard({ data }: SummaryCardProps) {
	return (
		<div
			style={{
				background: C.accentDim,
				border: `1px solid rgba(108,111,255,0.22)`,
				borderRadius: 14,
				padding: '14px 16px',
				fontSize: 14,
				color: C.textSec,
				lineHeight: 1.6,
			}}
		>
			{data.text}
		</div>
	)
}
