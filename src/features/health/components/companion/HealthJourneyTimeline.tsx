import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { healthReportPath } from '@/constants/routes'
import { HealthSectionLabel } from '@/features/health/components/companion/health-section-label'
import type { HealthJourneyEvent } from '@/features/health/types/health-companion.types'
import { FigmaCard } from '@/ui/figma/components/primitives'

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
			<FigmaCard style={{ padding: '16px 16px 8px' }}>
				{events.map((event, index) => (
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
							gap: 14,
							padding: '0 0 16px',
							background: 'transparent',
							border: 'none',
							cursor: event.reportId ? 'pointer' : 'default',
							fontFamily: 'inherit',
							textAlign: 'left',
							width: '100%',
							position: 'relative',
						}}
					>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								flexShrink: 0,
								width: 12,
							}}
						>
							<div
								style={{
									width: 10,
									height: 10,
									borderRadius: '50%',
									background: eventColor(event.kind),
									boxShadow: `0 0 0 3px ${eventColor(event.kind)}22`,
									marginTop: 5,
								}}
							/>
							{index < events.length - 1 ? (
								<div
									style={{
										flex: 1,
										width: 2,
										marginTop: 6,
										background: `linear-gradient(180deg, ${C.border} 0%, transparent 100%)`,
										minHeight: 36,
									}}
								/>
							) : null}
						</div>
						<div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
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
			</FigmaCard>
		</section>
	)
}
