import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	AlertCircle,
	ArrowRight,
	Check,
	ChevronRight,
	FileText,
	Minus,
	TrendingDown,
	TrendingUp,
} from 'lucide-react'
import { healthMetricPath, healthReportPath, ROUTES } from '@/constants/routes'
import type {
	HealthAttentionItem,
	HealthChangeItem,
	HealthCompanionView,
	HealthInsightGroup,
	HealthJourneyEvent,
	HealthReportSummary,
	HealthScoreReason,
	HealthTrendHighlight,
} from '@/features/health/types/health-companion.types'
import { scoreReportSearchRelevance } from '@/features/health/services/health-companion.service'
import type { UploadedHealthReport } from '@/features/health/types'
import {
	FigmaHealthRing,
	FigmaHealthSectionLabel,
	FigmaHealthTrendChart,
} from '@/ui/figma/health/figma-health-primitives'
import {
	figmaHealthScoreColor,
	figmaHealthStatusHeadline,
	figmaJourneyEventColor,
	figmaMetricStatusColor,
} from '@/ui/figma/health/figma-health-formatters'
import {
	HealthAiActionRow,
	HealthAiBadge,
} from '@/ui/figma/health/health-ai-actions'
import { HealthSearchField } from '@/ui/figma/health/health-ui'
import { FC, FigmaIconBox, figmaCardStyle } from '@/ui/figma/v2/atoms'

function attentionColor(item: HealthAttentionItem): string {
	if (item.severity === 'high') return FC.orange
	if (item.severity === 'medium') return FC.amber
	return FC.blue
}

function trendStatusColor(status: HealthTrendHighlight['status']): string {
	switch (status) {
		case 'improving':
			return FC.green
		case 'needs_attention':
		case 'new_finding':
			return FC.amber
		default:
			return FC.mid
	}
}

function trendStatusLabel(status: HealthTrendHighlight['status']): string {
	switch (status) {
		case 'improving':
			return 'Improving'
		case 'needs_attention':
			return 'Needs attention'
		case 'new_finding':
			return 'New finding'
		default:
			return 'Stable'
	}
}

function changeIcon(direction: HealthChangeItem['direction']) {
	if (direction === 'improved' || direction === 'resolved') {
		return TrendingUp
	}

	if (direction === 'worsened') {
		return TrendingDown
	}

	return Minus
}

function ScoreReasonIcon({ kind }: { kind: HealthScoreReason['kind'] }) {
	if (kind === 'warning') {
		return <AlertCircle size={14} color={FC.amber} />
	}

	return <Check size={14} color={FC.green} />
}

function SectionBlock({
	label,
	children,
	actionLabel,
	onAction,
}: {
	label: string
	children: ReactNode
	actionLabel?: string
	onAction?: () => void
}) {
	return (
		<div style={{ marginBottom: 22 }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 12,
				}}
			>
				<FigmaHealthSectionLabel>{label}</FigmaHealthSectionLabel>
				{actionLabel && onAction ? (
					<button
						type="button"
						onClick={onAction}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 3,
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							padding: 0,
							fontFamily: 'inherit',
						}}
					>
						<span style={{ color: FC.dim, fontSize: 12 }}>{actionLabel}</span>
						<ChevronRight size={12} color={FC.dim} />
					</button>
				) : null}
			</div>
			{children}
		</div>
	)
}

export function FigmaHealthOverviewView({
	companion,
	memberName,
}: {
	companion: HealthCompanionView
	memberName: string | null
}) {
	const navigate = useNavigate()
	const ringColor = figmaHealthScoreColor(companion.score)
	const latestReport = companion.recentReports[0]
	const showScore = companion.score !== null

	return (
		<div>
			<div
				style={{
					...figmaCardStyle,
					borderRadius: 26,
					padding: '20px 20px 18px',
					marginBottom: 22,
				}}
			>
				<div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
					<FigmaHealthRing score={companion.score} color={ringColor} />
					<div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
						<p
							style={{
								color: FC.dim,
								fontSize: 11,
								fontWeight: 600,
								letterSpacing: '0.08em',
								textTransform: 'uppercase',
								margin: '0 0 6px',
							}}
						>
							{memberName ?? 'Your health'}
						</p>
						<h2
							style={{
								color: FC.fg,
								fontSize: 20,
								fontWeight: 700,
								letterSpacing: -0.6,
								lineHeight: 1.25,
								margin: '0 0 6px',
							}}
						>
							{figmaHealthStatusHeadline(companion.status)}
						</h2>
						<p
							style={{
								color: FC.mid,
								fontSize: 13,
								lineHeight: 1.5,
								margin: 0,
							}}
						>
							{companion.statusDetail}
						</p>
					</div>
				</div>

				{showScore && companion.scoreReasons.length > 0 ? (
					<div
						style={{
							borderTop: `1px solid ${FC.line}`,
							marginTop: 18,
							paddingTop: 16,
						}}
					>
						<p
							style={{
								color: FC.dim,
								fontSize: 11,
								fontWeight: 600,
								letterSpacing: '0.08em',
								textTransform: 'uppercase',
								margin: '0 0 10px',
							}}
						>
							Because
						</p>
						<div style={{ display: 'grid', gap: 8 }}>
							{companion.scoreReasons.map((reason) => (
								<div
									key={reason.id}
									style={{ display: 'flex', alignItems: 'center', gap: 8 }}
								>
									<ScoreReasonIcon kind={reason.kind} />
									<span
										style={{
											color:
												reason.kind === 'warning'
													? FC.fg
													: 'rgba(255,255,255,0.62)',
											fontSize: 13.5,
											lineHeight: 1.4,
										}}
									>
										{reason.label}
									</span>
								</div>
							))}
						</div>
					</div>
				) : null}
			</div>

			{companion.attention.length > 0 ? (
				<SectionBlock label="Needs attention">
					{companion.attention.map((item) => {
						const color = attentionColor(item)

						return (
							<div
								key={item.id}
								style={{
									...figmaCardStyle,
									borderRadius: 18,
									padding: '16px 18px',
									marginBottom: 10,
									borderLeft: `3px solid ${color}`,
								}}
							>
								<p
									style={{
										color: FC.fg,
										fontSize: 14.5,
										fontWeight: 600,
										margin: '0 0 6px',
									}}
								>
									{item.title}
								</p>
								<p
									style={{
										color: FC.mid,
										fontSize: 13,
										lineHeight: 1.55,
										margin: '0 0 12px',
									}}
								>
									{item.detail}
								</p>
								<HealthAiActionRow
									query={item.title}
									reportId={item.reportId}
									compact
								/>
							</div>
						)
					})}
				</SectionBlock>
			) : (
				<SectionBlock label="Needs attention">
					<div
						style={{
							...figmaCardStyle,
							borderRadius: 18,
							padding: '16px 18px',
						}}
					>
						<p
							style={{
								color: FC.mid,
								fontSize: 14,
								margin: 0,
								lineHeight: 1.5,
							}}
						>
							No significant issues detected. Your latest results look steady.
						</p>
					</div>
				</SectionBlock>
			)}

			<SectionBlock label="Changes since last report">
				{companion.changes.length > 0 ? (
					<div
						style={{ ...figmaCardStyle, borderRadius: 18, overflow: 'hidden' }}
					>
						{companion.changes.map((change, index) => {
							const Icon = changeIcon(change.direction)
							const color =
								change.direction === 'worsened'
									? FC.amber
									: change.direction === 'improved' ||
										  change.direction === 'resolved'
										? FC.green
										: FC.mid

							return (
								<div
									key={change.id}
									style={{
										display: 'flex',
										alignItems: 'flex-start',
										gap: 12,
										padding: '14px 18px',
										borderBottom:
											index < companion.changes.length - 1
												? `1px solid ${FC.line}`
												: 'none',
									}}
								>
									<Icon size={16} color={color} style={{ marginTop: 2 }} />
									<div>
										<p
											style={{
												color: FC.fg,
												fontSize: 14,
												fontWeight: 600,
												margin: '0 0 4px',
											}}
										>
											{change.label}
										</p>
										{change.detail ? (
											<p
												style={{
													color: FC.mid,
													fontSize: 12.5,
													margin: 0,
													lineHeight: 1.45,
												}}
											>
												{change.detail}
											</p>
										) : null}
									</div>
								</div>
							)
						})}
					</div>
				) : (
					<div
						style={{
							...figmaCardStyle,
							borderRadius: 18,
							padding: '16px 18px',
						}}
					>
						<p
							style={{
								color: FC.mid,
								fontSize: 14,
								margin: 0,
								lineHeight: 1.5,
							}}
						>
							No significant changes detected since your previous report.
						</p>
					</div>
				)}
			</SectionBlock>

			{latestReport ? (
				<SectionBlock
					label="Latest report"
					actionLabel="All reports"
					onAction={() => navigate(ROUTES.healthReports)}
				>
					<div
						style={{
							...figmaCardStyle,
							borderRadius: 20,
							padding: '18px 18px 16px',
						}}
					>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'flex-start',
								gap: 10,
								marginBottom: 10,
							}}
						>
							<div>
								<p
									style={{
										color: FC.fg,
										fontSize: 16,
										fontWeight: 700,
										margin: '0 0 4px',
									}}
								>
									{latestReport.title}
								</p>
								<p style={{ color: FC.mid, fontSize: 12.5, margin: 0 }}>
									{latestReport.hospital} · {latestReport.displayDate}
								</p>
							</div>
							<HealthAiBadge />
						</div>
						<p
							style={{
								color: FC.mid,
								fontSize: 13.5,
								lineHeight: 1.55,
								margin: '0 0 10px',
							}}
						>
							{latestReport.summary}
						</p>
						{latestReport.findings.length > 0 ? (
							<div
								style={{
									display: 'flex',
									flexWrap: 'wrap',
									gap: 6,
									marginBottom: 14,
								}}
							>
								{latestReport.findings.slice(0, 3).map((finding) => (
									<span
										key={finding}
										style={{
											background: 'rgba(245,158,11,0.1)',
											border: '1px solid rgba(245,158,11,0.2)',
											borderRadius: 100,
											padding: '4px 10px',
											color: FC.amber,
											fontSize: 11.5,
											fontWeight: 600,
										}}
									>
										{finding}
									</span>
								))}
							</div>
						) : null}
						<HealthAiActionRow
							query={`Explain my latest health report: ${latestReport.title}`}
							reportId={latestReport.id}
						/>
						<button
							type="button"
							onClick={() => navigate(healthReportPath(latestReport.id))}
							style={{
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								gap: 6,
								width: '100%',
								marginTop: 12,
								background: FC.ghost,
								border: `1px solid ${FC.line}`,
								borderRadius: 14,
								padding: '11px 0',
								cursor: 'pointer',
								fontFamily: 'inherit',
							}}
						>
							<span style={{ color: FC.fg, fontSize: 13, fontWeight: 600 }}>
								Open report
							</span>
							<ArrowRight size={14} color={FC.mid} />
						</button>
					</div>
				</SectionBlock>
			) : null}

			{companion.trendHighlights.length > 0 ? (
				<SectionBlock
					label="Meaningful trends"
					actionLabel="All metrics"
					onAction={() => navigate(ROUTES.healthMetrics)}
				>
					<div style={{ display: 'grid', gap: 8 }}>
						{companion.trendHighlights.map((trend) => {
							const color = trendStatusColor(trend.status)

							return (
								<button
									key={trend.id}
									type="button"
									onClick={() =>
										trend.metricId
											? navigate(`${ROUTES.healthMetrics}#${trend.metricId}`)
											: navigate(ROUTES.healthMetrics)
									}
									style={{
										...figmaCardStyle,
										borderRadius: 16,
										padding: '14px 16px',
										display: 'flex',
										alignItems: 'center',
										gap: 12,
										cursor: 'pointer',
										width: '100%',
										textAlign: 'left',
										fontFamily: 'inherit',
										border: `1px solid ${color}22`,
									}}
								>
									<div style={{ flex: 1, minWidth: 0 }}>
										<p
											style={{
												color: FC.fg,
												fontSize: 14,
												fontWeight: 600,
												margin: '0 0 3px',
											}}
										>
											{trend.label}
										</p>
										<p
											style={{
												color: FC.mid,
												fontSize: 12.5,
												margin: 0,
												lineHeight: 1.4,
											}}
										>
											{trend.detail}
										</p>
									</div>
									<span
										style={{
											color,
											fontSize: 11,
											fontWeight: 700,
											flexShrink: 0,
										}}
									>
										{trendStatusLabel(trend.status)}
									</span>
								</button>
							)
						})}
					</div>
				</SectionBlock>
			) : null}
		</div>
	)
}

export function FigmaHealthReportsView({
	reports,
	needsReview,
	rawReports = [],
}: {
	reports: HealthReportSummary[]
	needsReview: number
	rawReports?: UploadedHealthReport[]
}) {
	const navigate = useNavigate()
	const [query, setQuery] = useState('')

	const filtered = useMemo(() => {
		const normalized = query.trim().toLowerCase()
		if (!normalized) return reports

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
		<div>
			<HealthSearchField
				value={query}
				onChange={setQuery}
				placeholder="Search reports, labs, doctors, tests…"
				ariaLabel="Search health reports"
			/>

			{needsReview > 0 ? (
				<div
					style={{
						background: 'rgba(245,158,11,0.07)',
						border: '1px solid rgba(245,158,11,0.2)',
						borderRadius: 18,
						padding: '14px 16px',
						display: 'flex',
						alignItems: 'center',
						gap: 12,
						marginBottom: 16,
					}}
				>
					<AlertCircle size={18} color={FC.amber} />
					<span
						style={{
							flex: 1,
							color: FC.amber,
							fontSize: 13.5,
							fontWeight: 500,
						}}
					>
						{needsReview} report{needsReview === 1 ? '' : 's'} awaiting review
					</span>
					<button
						type="button"
						onClick={() => navigate(ROUTES.healthImportReview)}
						style={{
							background: FC.amber,
							borderRadius: 10,
							padding: '6px 12px',
							cursor: 'pointer',
							border: 'none',
							fontFamily: 'inherit',
						}}
					>
						<span style={{ color: '#000', fontSize: 12, fontWeight: 700 }}>
							Review
						</span>
					</button>
				</div>
			) : null}

			{filtered.length === 0 ? (
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 18,
						padding: '24px 18px',
						textAlign: 'center',
					}}
				>
					<p style={{ color: FC.mid, fontSize: 14, margin: 0 }}>
						No reports match your search.
					</p>
				</div>
			) : (
				<div style={{ display: 'grid', gap: 12 }}>
					{filtered.map((report) => {
						const hasFindings = report.findings.length > 0
						const statusColor = hasFindings ? FC.amber : FC.green

						return (
							<div
								key={report.id}
								style={{
									...figmaCardStyle,
									borderRadius: 20,
									padding: '18px 18px 16px',
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
									<FigmaIconBox color={statusColor} size={40}>
										<FileText size={17} color={statusColor} strokeWidth={1.8} />
									</FigmaIconBox>
									<div style={{ flex: 1, minWidth: 0 }}>
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: 8,
												marginBottom: 4,
												flexWrap: 'wrap',
											}}
										>
											<p
												style={{
													color: FC.fg,
													fontSize: 15,
													fontWeight: 600,
													margin: 0,
												}}
											>
												{report.title}
											</p>
											<HealthAiBadge />
										</div>
										<p
											style={{
												color: FC.mid,
												fontSize: 12.5,
												margin: '0 0 2px',
											}}
										>
											{report.hospital}
											{report.doctor ? ` · ${report.doctor}` : ''}
										</p>
										<p style={{ color: FC.dim, fontSize: 12, margin: 0 }}>
											{report.displayDate}
										</p>
									</div>
									<span
										style={{
											background: `${statusColor}14`,
											border: `1px solid ${statusColor}28`,
											borderRadius: 100,
											padding: '4px 10px',
											color: statusColor,
											fontSize: 11,
											fontWeight: 700,
											flexShrink: 0,
										}}
									>
										{hasFindings ? 'Review' : 'Normal'}
									</span>
								</div>

								<p
									style={{
										color: FC.mid,
										fontSize: 13,
										lineHeight: 1.55,
										margin: '0 0 10px',
									}}
								>
									{report.summary}
								</p>

								{hasFindings ? (
									<div
										style={{
											display: 'flex',
											flexWrap: 'wrap',
											gap: 6,
											marginBottom: 12,
										}}
									>
										{report.findings.map((finding) => (
											<span
												key={finding}
												style={{
													background: 'rgba(245,158,11,0.1)',
													borderRadius: 100,
													padding: '4px 10px',
													color: FC.amber,
													fontSize: 11.5,
													fontWeight: 600,
												}}
											>
												{finding}
											</span>
										))}
									</div>
								) : null}

								<HealthAiActionRow
									query={`Summarize ${report.title} from ${report.hospital}`}
									reportId={report.id}
									compact
								/>

								<button
									type="button"
									onClick={() => navigate(healthReportPath(report.id))}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										gap: 6,
										width: '100%',
										marginTop: 10,
										background: FC.ghost,
										border: `1px solid ${FC.line}`,
										borderRadius: 12,
										padding: '10px 0',
										cursor: 'pointer',
										fontFamily: 'inherit',
									}}
								>
									<span style={{ color: FC.fg, fontSize: 13, fontWeight: 600 }}>
										Open report
									</span>
								</button>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}

export function FigmaHealthTimelineView({
	events,
}: {
	events: HealthJourneyEvent[]
}) {
	const navigate = useNavigate()

	const grouped = useMemo(() => {
		const map = new Map<string, HealthJourneyEvent[]>()

		for (const event of events) {
			const monthKey = new Date(event.date).toLocaleDateString('en-US', {
				month: 'long',
				year: 'numeric',
			})

			const existing = map.get(monthKey) ?? []
			existing.push(event)
			map.set(monthKey, existing)
		}

		return [...map.entries()]
	}, [events])

	return (
		<div>
			{grouped.map(([month, monthEvents]) => (
				<div key={month} style={{ marginBottom: 28 }}>
					<p
						style={{
							color: FC.dim,
							fontSize: 12,
							fontWeight: 700,
							letterSpacing: '0.06em',
							textTransform: 'uppercase',
							margin: '0 0 14px',
						}}
					>
						{month}
					</p>

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

						{monthEvents.map((event, index) => {
							const color = figmaJourneyEventColor(event.kind)
							const isCheckup = event.kind === 'checkup'

							return (
								<div
									key={event.id}
									style={{
										position: 'relative',
										marginBottom: index < monthEvents.length - 1 ? 16 : 0,
									}}
								>
									<div
										style={{
											position: 'absolute',
											left: -18,
											top: 8,
											width: 8,
											height: 8,
											borderRadius: 4,
											background: color,
											boxShadow: `0 0 0 3px ${color}20`,
										}}
									/>

									<div
										style={{
											...figmaCardStyle,
											borderRadius: 16,
											padding: isCheckup ? '16px 16px 14px' : '14px 16px',
											marginLeft: 8,
											borderLeft: isCheckup ? `3px solid ${color}` : undefined,
										}}
									>
										<p
											style={{
												color: FC.fg,
												fontSize: isCheckup ? 15 : 14,
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
												lineHeight: 1.5,
												margin: '0 0 10px',
											}}
										>
											{event.summary}
										</p>
										{event.reportId ? (
											<button
												type="button"
												onClick={() =>
													navigate(healthReportPath(event.reportId!))
												}
												style={{
													background: 'none',
													border: 'none',
													padding: 0,
													cursor: 'pointer',
													fontFamily: 'inherit',
													color: FC.blue,
													fontSize: 12.5,
													fontWeight: 600,
												}}
											>
												View report
											</button>
										) : null}
									</div>
								</div>
							)
						})}
					</div>
				</div>
			))}
		</div>
	)
}

export function FigmaHealthMetricsView({
	companion,
}: {
	companion: HealthCompanionView
}) {
	const navigate = useNavigate()

	const sections = useMemo(() => {
		const all = companion.metricGroups.flatMap((group) =>
			group.metrics.map((metric) => ({
				...metric,
				groupLabel: group.label,
				groupStatus: group.status,
			})),
		)

		return {
			attention: all.filter(
				(item) =>
					item.groupStatus === 'needs_attention' ||
					item.status === 'high' ||
					item.status === 'low' ||
					item.status === 'critical' ||
					item.status === 'borderline',
			),
			improving: all.filter((item) => item.groupStatus === 'improving'),
			stable: all.filter(
				(item) =>
					item.groupStatus === 'stable' &&
					!['high', 'low', 'critical', 'borderline'].includes(item.status),
			),
		}
	}, [companion.metricGroups])

	const renderSection = (label: string, items: typeof sections.attention) => {
		if (items.length === 0) return null

		return (
			<div style={{ marginBottom: 20 }}>
				<div style={{ marginBottom: 10 }}>
					<FigmaHealthSectionLabel>{label}</FigmaHealthSectionLabel>
				</div>
				<div
					style={{ ...figmaCardStyle, borderRadius: 18, overflow: 'hidden' }}
				>
					{items.slice(0, 8).map((metric, index) => (
						<button
							key={metric.id}
							type="button"
							onClick={() => navigate(healthMetricPath(metric.id))}
							style={{
								display: 'flex',
								alignItems: 'center',
								padding: '14px 18px',
								borderBottom:
									index < Math.min(items.length, 8) - 1
										? `1px solid ${FC.line}`
										: 'none',
								width: '100%',
								background: 'none',
								borderLeft: 'none',
								borderRight: 'none',
								borderTop: 'none',
								cursor: 'pointer',
								fontFamily: 'inherit',
								textAlign: 'left',
							}}
						>
							<div style={{ flex: 1, minWidth: 0 }}>
								<p
									style={{
										color: FC.fg,
										fontSize: 14,
										fontWeight: 600,
										margin: '0 0 2px',
									}}
								>
									{metric.name}
								</p>
								<p style={{ color: FC.dim, fontSize: 11.5, margin: 0 }}>
									{metric.groupLabel}
								</p>
							</div>
							<div style={{ textAlign: 'right' }}>
								<p
									style={{
										color: FC.fg,
										fontSize: 15,
										fontWeight: 700,
										margin: '0 0 2px',
									}}
								>
									{metric.value}
								</p>
								<p
									style={{
										color: figmaMetricStatusColor(metric.status),
										fontSize: 11.5,
										margin: 0,
										fontWeight: 600,
									}}
								>
									{metric.trendLabel}
								</p>
							</div>
						</button>
					))}
				</div>
			</div>
		)
	}

	return (
		<div>
			{companion.trendSeries.length > 0 ? (
				<div style={{ marginBottom: 20 }}>
					<div style={{ marginBottom: 10 }}>
						<FigmaHealthSectionLabel>Trends over time</FigmaHealthSectionLabel>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
						{companion.trendSeries.slice(0, 6).map((series) => (
							<FigmaHealthTrendChart key={series.id} series={series} />
						))}
					</div>
				</div>
			) : null}

			{renderSection('Needs attention', sections.attention)}
			{renderSection('Recently changed', sections.improving)}
			{renderSection('Stable & tracked', sections.stable)}
		</div>
	)
}

export function FigmaHealthInsightsView({
	groups,
}: {
	groups: HealthInsightGroup[]
}) {
	const navigate = useNavigate()

	return (
		<div>
			{groups.map((group) => {
				const trendColor =
					group.trend === 'Needs attention'
						? FC.amber
						: group.trend === 'Improving'
							? FC.green
							: FC.mid

				return (
					<div
						key={group.id}
						style={{
							...figmaCardStyle,
							borderRadius: 22,
							padding: '18px 18px 16px',
							marginBottom: 12,
							borderLeft: `3px solid ${group.color}`,
						}}
					>
						<div
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								marginBottom: 10,
							}}
						>
							<p
								style={{
									color: FC.fg,
									fontSize: 16,
									fontWeight: 700,
									margin: 0,
								}}
							>
								{group.label}
							</p>
							<span
								style={{
									color: trendColor,
									fontSize: 11.5,
									fontWeight: 700,
								}}
							>
								{group.trend}
							</span>
						</div>

						<p
							style={{
								color: FC.mid,
								fontSize: 14,
								lineHeight: 1.6,
								margin: '0 0 12px',
							}}
						>
							{group.summary}
						</p>

						<div
							style={{
								background: FC.raise,
								borderRadius: 12,
								padding: '10px 12px',
								marginBottom: 10,
							}}
						>
							<p
								style={{
									color: FC.dim,
									fontSize: 10.5,
									fontWeight: 700,
									textTransform: 'uppercase',
									letterSpacing: '0.06em',
									margin: '0 0 4px',
								}}
							>
								Evidence
							</p>
							<p
								style={{
									color: FC.mid,
									fontSize: 12.5,
									margin: 0,
									lineHeight: 1.45,
								}}
							>
								{group.evidence}
							</p>
						</div>

						<p
							style={{
								color: FC.fg,
								fontSize: 13,
								lineHeight: 1.5,
								margin: '0 0 14px',
							}}
						>
							<span style={{ color: FC.dim, fontWeight: 600 }}>
								Next step:{' '}
							</span>
							{group.nextStep}
						</p>

						<HealthAiActionRow
							query={`Explain my ${group.label.toLowerCase()} health: ${group.summary}`}
							reportId={group.reportId}
							compact
						/>

						{group.metricId ? (
							<button
								type="button"
								onClick={() => navigate(healthMetricPath(group.metricId!))}
								style={{
									marginTop: 10,
									background: 'none',
									border: 'none',
									padding: 0,
									cursor: 'pointer',
									fontFamily: 'inherit',
									color: FC.blue,
									fontSize: 12.5,
									fontWeight: 600,
								}}
							>
								View metric trend
							</button>
						) : null}
					</div>
				)
			})}
		</div>
	)
}
