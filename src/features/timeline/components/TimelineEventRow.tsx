import {
	formatTimelineModuleLabel,
	formatTimelineTimestamp,
	getTimelineImportanceColor,
	getTimelineModuleColor,
} from '@/features/timeline/utils/timeline-display'
import { TimelineModuleIcon } from '@/features/timeline/components/TimelineModuleIcon'
import type { ChronicleTimelineEvent } from '@/features/timeline/types/timeline.types'
import { C } from '@/constants/colors'

interface TimelineEventRowProps {
	event: ChronicleTimelineEvent
	showModule?: boolean
}

export function TimelineEventRow({
	event,
	showModule = true,
}: TimelineEventRowProps) {
	const moduleColor = getTimelineModuleColor(event.sourceModule)

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'flex-start',
				gap: 12,
				padding: '14px 16px',
			}}
		>
			<div
				style={{
					width: 36,
					height: 36,
					borderRadius: 11,
					background: `${moduleColor}18`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				<TimelineModuleIcon module={event.sourceModule} color={moduleColor} />
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						display: 'flex',
						alignItems: 'baseline',
						justifyContent: 'space-between',
						gap: 8,
						marginBottom: 3,
					}}
				>
					<div style={{ fontSize: 14, fontWeight: 700 }}>{event.title}</div>
					<div
						style={{
							fontSize: 11,
							color: C.textMuted,
							flexShrink: 0,
						}}
					>
						{formatTimelineTimestamp(event.timestamp)}
					</div>
				</div>
				<div
					style={{
						fontSize: 12,
						color: C.textSec,
						lineHeight: 1.45,
						marginBottom: showModule ? 6 : 0,
					}}
				>
					{event.summary}
				</div>
				{showModule ? (
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 8,
							flexWrap: 'wrap',
						}}
					>
						<span
							style={{
								fontSize: 10,
								fontWeight: 700,
								textTransform: 'uppercase',
								letterSpacing: '0.05em',
								color: moduleColor,
							}}
						>
							{formatTimelineModuleLabel(event.sourceModule)}
						</span>
						<span
							style={{
								width: 4,
								height: 4,
								borderRadius: '50%',
								background: getTimelineImportanceColor(event.importance),
							}}
						/>
					</div>
				) : null}
			</div>
		</div>
	)
}
