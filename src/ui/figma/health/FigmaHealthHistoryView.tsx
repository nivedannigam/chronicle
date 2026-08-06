import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { healthVisitPath } from '@/constants/routes'
import type { VisitChangeItem } from '@/features/health/services/health-visit-changes.service'
import type { HealthVisit } from '@/features/health/types/health-visit.types'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function FigmaHealthHistoryView({
	visits,
	visitChanges = {},
}: {
	visits: HealthVisit[]
	visitChanges?: Record<string, VisitChangeItem[]>
}) {
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
			<p
				style={{
					color: FC.fg,
					fontSize: 28,
					fontWeight: 700,
					letterSpacing: -0.8,
					margin: '0 0 6px',
					lineHeight: 1.15,
				}}
			>
				Your health journey
			</p>
			<p
				style={{
					color: FC.mid,
					fontSize: 15,
					lineHeight: 1.5,
					margin: '0 0 28px',
				}}
			>
				What happened over time
			</p>

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

						{yearVisits.map((visit, index) => {
							const changes = visitChanges[visit.id] ?? []

							return (
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
											borderRadius: 20,
											padding: '18px 18px 16px',
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
												fontSize: 16,
												fontWeight: 700,
												margin: '0 0 4px',
												letterSpacing: -0.2,
											}}
										>
											{visit.title}
										</p>
										<p
											style={{
												color: FC.mid,
												fontSize: 13,
												margin: '0 0 10px',
											}}
										>
											{visit.hospital}
										</p>
										<p
											style={{
												color: FC.mid,
												fontSize: 14,
												lineHeight: 1.55,
												margin: '0 0 12px',
											}}
										>
											{visit.summaryParagraph || visit.summaryLine}
										</p>

										{changes.length > 0 ? (
											<div
												style={{
													display: 'flex',
													flexWrap: 'wrap',
													gap: 6,
												}}
											>
												{changes.slice(0, 3).map((change) => (
													<span
														key={change.id}
														style={{
															background: FC.ghost,
															border: `1px solid ${FC.line}`,
															borderRadius: 100,
															padding: '4px 10px',
															color: FC.mid,
															fontSize: 11.5,
															fontWeight: 500,
														}}
													>
														{change.label}
														{change.tone === 'improved'
															? ' ↑'
															: change.tone === 'attention'
																? ' ↓'
																: ''}
													</span>
												))}
											</div>
										) : null}

										{visit.documents.length > 0 ? (
											<p
												style={{
													color: FC.dim,
													fontSize: 12,
													margin: changes.length > 0 ? '10px 0 0' : 0,
												}}
											>
												{visit.documents[0]?.documentType}
												{visit.reportCount > 1
													? ` · ${visit.reportCount} reports`
													: ''}
											</p>
										) : null}
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
