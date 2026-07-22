import { C } from '@/constants/colors'
import type { HealthInsight } from '@/features/health/types'

function toneColor(tone: HealthInsight['tone']): string {
	switch (tone) {
		case 'positive':
			return C.greenAlt
		case 'warning':
			return C.orange
		default:
			return C.accentBlue
	}
}

interface HealthInsightsListProps {
	insights: HealthInsight[]
}

export function HealthInsightsList({ insights }: HealthInsightsListProps) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 18,
				overflow: 'hidden',
				marginBottom: 26,
			}}
		>
			{insights.map((insight, index) => (
				<div
					key={insight.id}
					style={{
						padding: '14px 16px',
						borderBottom:
							index < insights.length - 1 ? `1px solid ${C.border}` : 'none',
						display: 'flex',
						gap: 12,
						alignItems: 'flex-start',
					}}
				>
					<div
						style={{
							width: 6,
							height: 6,
							borderRadius: '50%',
							background: toneColor(insight.tone),
							marginTop: 6,
							flexShrink: 0,
							boxShadow: `0 0 6px ${toneColor(insight.tone)}`,
						}}
					/>
					<p
						style={{
							margin: 0,
							fontSize: 14,
							color: C.textSec,
							lineHeight: 1.5,
						}}
					>
						{insight.text}
					</p>
				</div>
			))}
		</div>
	)
}
