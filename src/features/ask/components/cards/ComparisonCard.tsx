import { C } from '@/constants/colors'
import type { ComparisonCardData } from '@/features/ask/types'

interface ComparisonCardProps {
	data: ComparisonCardData
}

export function ComparisonCard({ data }: ComparisonCardProps) {
	return (
		<div
			style={{
				background: C.card2,
				border: `1px solid ${C.border}`,
				borderRadius: 14,
				padding: '12px 14px',
			}}
		>
			<div
				style={{
					fontSize: 14,
					fontWeight: 700,
					color: C.text,
					marginBottom: 8,
				}}
			>
				{data.label}
			</div>
			<div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>
				{data.olderLabel} → {data.newerLabel}
			</div>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
				{data.metrics.map((metric) => (
					<div
						key={metric.metric}
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							gap: 8,
							fontSize: 12,
							color: C.textSec,
						}}
					>
						<span>{metric.metric}</span>
						<span>
							{metric.oldValue} → {metric.newValue} ({metric.difference})
						</span>
					</div>
				))}
			</div>
		</div>
	)
}
