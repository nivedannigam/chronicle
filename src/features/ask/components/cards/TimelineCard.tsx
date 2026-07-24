import { C } from '@/constants/colors'
import type { TimelineCardData } from '@/features/ask/types'

interface TimelineCardProps {
	data: TimelineCardData
}

export function TimelineCard({ data }: TimelineCardProps) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 14,
				overflow: 'hidden',
			}}
		>
			{data.items.map((item, index) => (
				<div
					key={`${item.title}-${index}`}
					style={{
						padding: '12px 16px',
						borderBottom:
							index < data.items.length - 1 ? `1px solid ${C.border}` : 'none',
					}}
				>
					<div
						style={{
							fontSize: 14,
							fontWeight: 600,
							color: C.text,
							marginBottom: 4,
						}}
					>
						{item.title}
					</div>
					<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
						<span style={{ fontSize: 12, color: C.textMuted }}>
							{item.date}
						</span>
						{item.status ? (
							<span
								style={{
									fontSize: 10,
									fontWeight: 700,
									color: C.accentBlue,
									background: C.accentBlueDim,
									borderRadius: 100,
									padding: '2px 8px',
								}}
							>
								{item.status}
							</span>
						) : null}
					</div>
				</div>
			))}
		</div>
	)
}
