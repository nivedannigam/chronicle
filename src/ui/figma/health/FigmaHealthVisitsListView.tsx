import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'
import type { HealthVisit } from '@/features/health/types/health-visit.types'
import type { UploadedHealthReport } from '@/features/health/types'
import { scoreReportSearchRelevance } from '@/features/health/services/health-companion.service'
import { healthVisitPath } from '@/constants/routes'
import { HealthSearchField } from '@/ui/figma/health/health-ui'
import { FC, FigmaIconBox, figmaCardStyle } from '@/ui/figma/v2/atoms'

function statusColor(status: HealthVisit['status']): string {
	switch (status) {
		case 'ready':
			return FC.green
		case 'organizing':
			return FC.amber
		case 'needs_help':
			return FC.orange
		default:
			return FC.mid
	}
}

export function FigmaHealthVisitsListView({
	visits,
	rawReports = [],
}: {
	visits: HealthVisit[]
	rawReports?: UploadedHealthReport[]
}) {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')

	const filtered = useMemo(() => {
		const normalized = query.trim().toLowerCase()
		if (!normalized) {
			return visits
		}

		const matchedReportIds = new Set(
			rawReports
				.map((report) => ({
					report,
					score: scoreReportSearchRelevance(report, normalized),
				}))
				.filter((item) => item.score > 0)
				.map((item) => item.report.id),
		)

		return visits.filter((visit) => {
			const visitText =
				`${visit.title} ${visit.hospital} ${visit.displayDate}`.toLowerCase()

			if (visitText.includes(normalized)) {
				return true
			}

			return visit.reportIds.some((reportId) => matchedReportIds.has(reportId))
		})
	}, [query, visits, rawReports])

	return (
		<div style={{ paddingBottom: 24 }}>
			<HealthSearchField
				value={query}
				onChange={setQuery}
				placeholder="Search visits, labs, or dates…"
				ariaLabel="Search health visits"
			/>

			{filtered.length === 0 ? (
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 18,
						padding: '24px 18px',
						textAlign: 'center',
						marginTop: 16,
					}}
				>
					<p style={{ color: FC.mid, fontSize: 14, margin: 0 }}>
						No health visits match your search.
					</p>
				</div>
			) : (
				<div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
					{filtered.map((visit) => {
						const color = statusColor(visit.status)

						return (
							<button
								key={visit.id}
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
								<div
									style={{
										display: 'flex',
										alignItems: 'flex-start',
										gap: 12,
										marginBottom: 12,
									}}
								>
									<FigmaIconBox color={color} size={40}>
										<Stethoscope size={17} color={color} strokeWidth={1.8} />
									</FigmaIconBox>
									<div style={{ flex: 1, minWidth: 0 }}>
										<p
											style={{
												color: FC.fg,
												fontSize: 16,
												fontWeight: 700,
												margin: '0 0 4px',
											}}
										>
											{visit.title}
										</p>
										<p
											style={{
												color: FC.mid,
												fontSize: 12.5,
												margin: '0 0 2px',
											}}
										>
											{visit.displayMonthYear} · {visit.hospital}
										</p>
										<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>
											{visit.reportCount} report
											{visit.reportCount === 1 ? '' : 's'} · {visit.summaryLine}
										</p>
									</div>
								</div>
								<span
									style={{
										display: 'inline-flex',
										alignItems: 'center',
										background: `${color}14`,
										border: `1px solid ${color}30`,
										borderRadius: 100,
										padding: '4px 10px',
										color,
										fontSize: 11.5,
										fontWeight: 700,
									}}
								>
									{visit.statusLabel}
								</span>
							</button>
						)
					})}
				</div>
			)}
		</div>
	)
}
