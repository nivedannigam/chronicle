import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { healthVisitPath } from '@/constants/routes'
import type { HealthVisit } from '@/features/health/types/health-visit.types'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function FigmaHealthHistoryView({ visits }: { visits: HealthVisit[] }) {
	const navigate = useNavigate()

	const grouped = useMemo(() => {
		const map = new Map<string, HealthVisit[]>()

		for (const visit of visits) {
			const year = new Date(visit.date).getFullYear().toString()
			const existing = map.get(year) ?? []
			existing.push(visit)
			map.set(year, existing)
		}

		return [...map.entries()].sort(
			(a, b) => Number.parseInt(b[0], 10) - Number.parseInt(a[0], 10),
		)
	}, [visits])

	return (
		<div style={{ paddingBottom: 24 }}>
			{grouped.map(([year, yearVisits]) => (
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

						{yearVisits.map((visit, index) => (
							<div
								key={visit.id}
								style={{
									position: 'relative',
									marginBottom: index < yearVisits.length - 1 ? 16 : 0,
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
										background: FC.blue,
										boxShadow: `0 0 0 3px ${FC.blue}20`,
									}}
								/>

								<button
									type="button"
									onClick={() => navigate(healthVisitPath(visit.id))}
									style={{
										...figmaCardStyle,
										borderRadius: 18,
										padding: '16px 18px',
										width: '100%',
										textAlign: 'left',
										cursor: 'pointer',
										fontFamily: 'inherit',
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
										{visit.displayMonthYear}
									</p>
									<p
										style={{
											color: FC.fg,
											fontSize: 15,
											fontWeight: 600,
											margin: '0 0 4px',
										}}
									>
										{visit.title}
									</p>
									<p
										style={{
											color: FC.mid,
											fontSize: 13,
											lineHeight: 1.45,
											margin: 0,
										}}
									>
										{visit.hospital} · {visit.summaryLine}
									</p>
								</button>
							</div>
						))}
					</div>
				</section>
			))}
		</div>
	)
}
