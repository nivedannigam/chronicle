import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { healthReportPath } from '@/constants/routes'
import type { ProductReportCard } from '@/features/health/services/health-product.mapper'
import { scoreReportSearchRelevance } from '@/features/health/services/health-companion.service'
import type { UploadedHealthReport } from '@/features/health/types'
import { HealthSearchField } from '@/ui/figma/health/health-ui'
import { FC, FigmaIconBox, figmaCardStyle } from '@/ui/figma/v2/atoms'

function statusColor(status: ProductReportCard['status']): string {
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

export function FigmaHealthReportsListView({
	reports,
	rawReports = [],
}: {
	reports: ProductReportCard[]
	rawReports?: UploadedHealthReport[]
}) {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')

	const filtered = useMemo(() => {
		const normalized = query.trim().toLowerCase()
		if (!normalized) {
			return reports
		}

		const ranked = rawReports
			.map((report) => ({
				report,
				score: scoreReportSearchRelevance(report, normalized),
			}))
			.filter((item) => item.score > 0)
			.sort((a, b) => b.score - a.score)

		const ids = new Set(ranked.map((item) => item.report.id))
		return reports.filter((report) => ids.has(report.id))
	}, [query, reports, rawReports])

	return (
		<div style={{ paddingBottom: 24 }}>
			<HealthSearchField
				value={query}
				onChange={setQuery}
				placeholder="Search reports, labs, or dates…"
				ariaLabel="Search health reports"
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
						No reports match your search.
					</p>
				</div>
			) : (
				<div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
					{filtered.map((report) => {
						const color = statusColor(report.status)

						return (
							<button
								key={report.id}
								type="button"
								onClick={() => navigate(healthReportPath(report.id))}
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
										marginBottom: 10,
									}}
								>
									<FigmaIconBox color={color} size={40}>
										<FileText size={17} color={color} strokeWidth={1.8} />
									</FigmaIconBox>
									<div style={{ flex: 1, minWidth: 0 }}>
										<p
											style={{
												color: FC.fg,
												fontSize: 15,
												fontWeight: 600,
												margin: '0 0 4px',
											}}
										>
											{report.title}
										</p>
										<p
											style={{
												color: FC.mid,
												fontSize: 12.5,
												margin: '0 0 2px',
											}}
										>
											{report.displayDate} · {report.hospital}
										</p>
										<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>
											{report.documentType}
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
									{report.statusLabel}
								</span>
							</button>
						)
					})}
				</div>
			)}
		</div>
	)
}
