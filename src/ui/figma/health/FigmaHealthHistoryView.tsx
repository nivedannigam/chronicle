import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { healthReportPath } from '@/constants/routes'
import type { HealthJourneyEvent } from '@/features/health/types/health-companion.types'
import {
	filterMajorHistoryEvents,
	groupHistoryEventsByYear,
} from '@/features/health/services/health-product.mapper'
import { figmaJourneyEventColor } from '@/ui/figma/health/figma-health-formatters'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function FigmaHealthHistoryView({
	events,
}: {
	events: HealthJourneyEvent[]
}) {
	const navigate = useNavigate()

	const grouped = useMemo(() => {
		const filtered = filterMajorHistoryEvents(events)
		return groupHistoryEventsByYear(filtered)
	}, [events])

	return (
		<div style={{ paddingBottom: 24 }}>
			{grouped.map(([year, yearEvents]) => (
				<section key={year} style={{ marginBottom: 32 }}>
					<div style={{ marginBottom: 14 }}>
						<FigmaHealthSectionLabel>{year}</FigmaHealthSectionLabel>
					</div>

					<div style={{ position: 'relative', paddingLeft: 22 }}>
						<div
							style={{
								position: 'absolute',
								left: 7,
								top: 6,
								bottom: 6,
								width: 1,
								background: FC.line,
							}}
						/>

						{yearEvents.map((event, index) => {
							const color = figmaJourneyEventColor(event.kind)

							return (
								<div
									key={event.id}
									style={{
										position: 'relative',
										marginBottom: index < yearEvents.length - 1 ? 16 : 0,
									}}
								>
									<div
										style={{
											position: 'absolute',
											left: -18,
											top: 10,
											width: 8,
											height: 8,
											borderRadius: 4,
											background: color,
											boxShadow: `0 0 0 3px ${color}20`,
										}}
									/>

									<button
										type="button"
										onClick={() => {
											if (event.reportId) {
												navigate(healthReportPath(event.reportId))
											}
										}}
										disabled={!event.reportId}
										style={{
											...figmaCardStyle,
											borderRadius: 18,
											padding: '16px 18px',
											width: '100%',
											textAlign: 'left',
											cursor: event.reportId ? 'pointer' : 'default',
											fontFamily: 'inherit',
											opacity: event.reportId ? 1 : 0.92,
										}}
									>
										<p
											style={{
												color: FC.dim,
												fontSize: 12,
												fontWeight: 600,
												margin: '0 0 6px',
											}}
										>
											{event.displayDate}
										</p>
										<p
											style={{
												color: FC.fg,
												fontSize: 15,
												fontWeight: 600,
												margin: '0 0 4px',
											}}
										>
											{event.title}
										</p>
										<p
											style={{
												color: FC.mid,
												fontSize: 13,
												lineHeight: 1.45,
												margin: 0,
											}}
										>
											{event.summary}
										</p>
									</button>
								</div>
							)
						})}
					</div>
				</section>
			))}
		</div>
	)
}
