import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { healthReportPath } from '@/constants/routes'
import { HealthSectionLabel } from '@/features/health/components/companion/HealthAttentionList'
import type { HealthJourneyEvent } from '@/features/health/types/health-companion.types'

interface HealthJourneyTimelineProps {
	events: HealthJourneyEvent[]
}

function eventColor(kind: HealthJourneyEvent['kind']): string {
	switch (kind) {
		case 'finding':
			return C.orange
		case 'improvement':
			return C.greenAlt
		case 'review':
			return C.accentBlue
		default:
			return C.teal
	}
}

export function HealthJourneyTimeline({ events }: HealthJourneyTimelineProps) {
	const navigate = useNavigate()

	if (events.length === 0) {
		return null
	}

	return (
		<section>
			<HealthSectionLabel>Your health journey</HealthSectionLabel>
			<div style={{ display: 'grid', gap: 10 }}>
				{events.map((event) => (
					<button
						key={event.id}
						type="button"
						onClick={() => {
							if (event.reportId) {
								navigate(healthReportPath(event.reportId))
							}
						}}
						style={{
							display: 'flex',
							gap: 12,
							padding: '14px 16px',
							borderRadius: 16,
							background: C.card,
							border: `1px solid ${C.border}`,
							cursor: event.reportId ? 'pointer' : 'default',
							fontFamily: 'inherit',
							textAlign: 'left',
							width: '100%',
						}}
					>
						<div
							style={{
								width: 10,
								height: 10,
								borderRadius: '50%',
								background: eventColor(event.kind),
								marginTop: 5,
								flexShrink: 0,
							}}
						/>
						<div style={{ flex: 1, minWidth: 0 }}>
							<div
								style={{
									fontSize: 11,
									color: C.textMuted,
									marginBottom: 4,
									fontWeight: 600,
								}}
							>
								{event.displayDate}
							</div>
							<div
								style={{
									fontSize: 14,
									fontWeight: 700,
									marginBottom: 4,
								}}
							>
								{event.title}
							</div>
							<div
								style={{
									fontSize: 13,
									color: C.textSec,
									lineHeight: 1.45,
								}}
							>
								{event.summary}
							</div>
						</div>
					</button>
				))}
			</div>
		</section>
	)
}
