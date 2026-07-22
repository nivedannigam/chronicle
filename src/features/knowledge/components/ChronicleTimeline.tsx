import { C } from '@/constants/colors'
import type { KnowledgeTimelineEntry } from '@/features/knowledge/types'

interface ChronicleTimelineProps {
	entries: KnowledgeTimelineEntry[]
	emptyMessage?: string
}

export function ChronicleTimeline({
	entries,
	emptyMessage = 'No timeline items yet.',
}: ChronicleTimelineProps) {
	if (entries.length === 0) {
		return (
			<div
				style={{
					fontSize: 13,
					color: C.textMuted,
					lineHeight: 1.5,
				}}
			>
				{emptyMessage}
			</div>
		)
	}

	return (
		<div style={{ position: 'relative', paddingLeft: 20 }}>
			<div
				style={{
					position: 'absolute',
					left: 7,
					top: 8,
					bottom: 0,
					width: 1,
					background: `linear-gradient(to bottom, ${C.accent}80, ${C.accent}00)`,
				}}
			/>
			{entries.map((item, index) => (
				<div
					key={item.id}
					style={{
						display: 'flex',
						gap: 14,
						marginBottom: index === entries.length - 1 ? 0 : 16,
						position: 'relative',
					}}
				>
					<div
						style={{
							position: 'absolute',
							left: -16,
							top: 6,
							width: 7,
							height: 7,
							borderRadius: '50%',
							background: item.color,
							boxShadow: `0 0 7px ${item.color}`,
						}}
					/>
					<div>
						<div
							style={{
								fontSize: 11,
								color: C.textMuted,
								marginBottom: 2,
							}}
						>
							{item.time}
						</div>
						<div style={{ fontSize: 13, color: C.textSec }}>{item.event}</div>
					</div>
				</div>
			))}
		</div>
	)
}
