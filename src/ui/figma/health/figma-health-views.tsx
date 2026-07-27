import { useNavigate } from 'react-router-dom'
import { AlertCircle, FileText, Sparkles } from 'lucide-react'
import { healthReportPath, ROUTES } from '@/constants/routes'
import type {
	HealthAttentionItem,
	HealthCompanionView,
	HealthJourneyEvent,
	HealthReportSummary,
} from '@/features/health/types/health-companion.types'
import {
	FigmaHealthRing,
	FigmaHealthSectionLabel,
	FigmaMiniHealthRing,
	FigmaSparkline,
	figmaHealthScoreColor,
	figmaHealthStatusHeadline,
	figmaJourneyEventColor,
	figmaMetricStatusColor,
	figmaMetricStatusLabel,
} from '@/ui/figma/health/figma-health-primitives'
import { FC, FigmaIconBox, figmaCardStyle } from '@/ui/figma/v2/atoms'

function attentionColor(item: HealthAttentionItem): string {
	if (item.severity === 'high') return FC.orange
	if (item.severity === 'medium') return FC.amber
	return FC.blue
}

export function FigmaHealthOverviewView({
	companion,
	memberName,
	familyRings = [],
	metricSparklines = {},
}: {
	companion: HealthCompanionView
	memberName: string | null
	familyRings?: Array<{ name: string; score: number; color: string }>
	metricSparklines?: Record<string, number[]>
}) {
	const navigate = useNavigate()
	const score = companion.score ?? 0
	const ringColor = figmaHealthScoreColor(companion.score)
	const vitals = companion.metricGroups
		.flatMap((group) => group.metrics)
		.slice(0, 5)

	return (
		<div>
			<div
				style={{
					background:
						'linear-gradient(135deg,rgba(16,185,129,0.07),rgba(16,185,129,0.03))',
					border: '1px solid rgba(16,185,129,0.14)',
					borderRadius: 28,
					padding: '22px 22px 18px',
					marginBottom: 22,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 22,
						marginBottom: familyRings.length > 0 ? 18 : 0,
					}}
				>
					<FigmaHealthRing score={score} color={ringColor} />
					<div style={{ flex: 1, minWidth: 0 }}>
						<p
							style={{
								color: 'rgba(255,255,255,0.32)',
								fontSize: 11,
								fontWeight: 600,
								letterSpacing: '0.08em',
								textTransform: 'uppercase',
								marginBottom: 8,
								marginTop: 0,
							}}
						>
							{memberName ?? 'You'}
						</p>
						<h2
							style={{
								color: FC.fg,
								fontSize: 22,
								fontWeight: 700,
								letterSpacing: -0.8,
								lineHeight: 1.2,
								marginBottom: 8,
								marginTop: 0,
							}}
						>
							{figmaHealthStatusHeadline(companion.status)}
						</h2>
						<p
							style={{
								color: FC.mid,
								fontSize: 13.5,
								lineHeight: 1.5,
								margin: 0,
							}}
						>
							{companion.statusDetail}
						</p>
					</div>
				</div>
				{familyRings.length > 0 ? (
					<div
						style={{
							borderTop: '1px solid rgba(255,255,255,0.06)',
							paddingTop: 14,
							display: 'flex',
							justifyContent: 'space-around',
						}}
					>
						{familyRings.map((member) => (
							<FigmaMiniHealthRing
								key={member.name}
								score={member.score}
								color={member.color}
								label={member.name}
							/>
						))}
					</div>
				) : null}
			</div>

			{companion.attention.length > 0 ? (
				<div style={{ marginBottom: 22 }}>
					<div style={{ marginBottom: 12 }}>
						<FigmaHealthSectionLabel>
							Needs Your Attention
						</FigmaHealthSectionLabel>
					</div>
					{companion.attention.map((item) => {
						const color = attentionColor(item)

						return (
							<div
								key={item.id}
								style={{
									...figmaCardStyle,
									borderRadius: 20,
									padding: '18px 20px',
									marginBottom: 10,
									borderLeft: `3px solid ${color}`,
								}}
							>
								<p
									style={{
										color: FC.fg,
										fontSize: 14.5,
										fontWeight: 600,
										letterSpacing: -0.3,
										marginBottom: 7,
										marginTop: 0,
									}}
								>
									{item.title}
								</p>
								<p
									style={{
										color: FC.mid,
										fontSize: 13.5,
										lineHeight: 1.6,
										marginBottom: 12,
										marginTop: 0,
									}}
								>
									{item.detail}
								</p>
								<div style={{ display: 'flex', gap: 10 }}>
									{item.metricId ? (
										<button
											type="button"
											onClick={() =>
												navigate(`${ROUTES.healthMetrics}#${item.metricId}`)
											}
											style={{
												flex: 1,
												background: `${color}10`,
												border: `1px solid ${color}22`,
												borderRadius: 12,
												padding: '8px 0',
												cursor: 'pointer',
												fontFamily: 'inherit',
											}}
										>
											<span style={{ color, fontSize: 13, fontWeight: 600 }}>
												Track
											</span>
										</button>
									) : null}
									<button
										type="button"
										onClick={() =>
											navigate(
												item.reportId
													? healthReportPath(item.reportId)
													: `${ROUTES.ask}?q=${encodeURIComponent(item.title)}`,
											)
										}
										style={{
											flex: 1,
											background: FC.ghost,
											borderRadius: 12,
											padding: '8px 0',
											cursor: 'pointer',
											border: 'none',
											fontFamily: 'inherit',
										}}
									>
										<span
											style={{ color: FC.mid, fontSize: 13, fontWeight: 500 }}
										>
											Ask Chronicle
										</span>
									</button>
								</div>
							</div>
						)
					})}
				</div>
			) : null}

			{vitals.length > 0 ? (
				<div style={{ marginBottom: 22 }}>
					<div style={{ marginBottom: 12 }}>
						<FigmaHealthSectionLabel>Key Vitals</FigmaHealthSectionLabel>
					</div>
					<div
						style={{ ...figmaCardStyle, borderRadius: 22, overflow: 'hidden' }}
					>
						{vitals.map((vital, index) => {
							const statusColor = figmaMetricStatusColor(vital.status)
							const spark = metricSparklines[vital.id]

							return (
								<div
									key={vital.id}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 10,
										padding: '13px 20px',
										borderBottom:
											index < vitals.length - 1
												? '1px solid rgba(255,255,255,0.05)'
												: 'none',
									}}
								>
									<span
										style={{
											flex: 1,
											color: 'rgba(255,255,255,0.5)',
											fontSize: 13.5,
										}}
									>
										{vital.name}
									</span>
									{spark && spark.length >= 2 ? (
										<FigmaSparkline data={spark} color={statusColor} />
									) : null}
									<div style={{ textAlign: 'right', minWidth: 72 }}>
										<p
											style={{
												color: FC.fg,
												fontSize: 15,
												fontWeight: 700,
												letterSpacing: -0.4,
												marginBottom: 1,
												marginTop: 0,
											}}
										>
											{vital.value}
										</p>
										<p
											style={{
												color: statusColor,
												fontSize: 11,
												fontWeight: 500,
												margin: 0,
											}}
										>
											{figmaMetricStatusLabel(vital.status, vital.trendLabel)}
										</p>
									</div>
								</div>
							)
						})}
					</div>
				</div>
			) : null}
		</div>
	)
}

export function FigmaHealthReportsView({
	reports,
	needsReview,
	memberName,
}: {
	reports: HealthReportSummary[]
	needsReview: number
	memberName: string | null
}) {
	const navigate = useNavigate()

	return (
		<div>
			{needsReview > 0 ? (
				<div
					style={{
						background: 'rgba(245,158,11,0.07)',
						border: '1px solid rgba(245,158,11,0.2)',
						borderRadius: 20,
						padding: '14px 20px',
						display: 'flex',
						alignItems: 'center',
						gap: 12,
						marginBottom: 20,
					}}
				>
					<AlertCircle size={18} color={FC.amber} />
					<span
						style={{ flex: 1, color: FC.amber, fontSize: 14, fontWeight: 500 }}
					>
						{needsReview} report{needsReview === 1 ? '' : 's'} pending your
						review
					</span>
					<button
						type="button"
						onClick={() => navigate(ROUTES.healthImportReview)}
						style={{
							background: FC.amber,
							borderRadius: 10,
							padding: '5px 14px',
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

			<div style={{ ...figmaCardStyle, borderRadius: 22, overflow: 'hidden' }}>
				{reports.map((report, index) => {
					const ok = report.findings.length === 0
					const color = ok ? FC.green : FC.amber

					return (
						<button
							key={report.id}
							type="button"
							onClick={() => navigate(healthReportPath(report.id))}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 13,
								padding: '15px 20px',
								borderBottom:
									index < reports.length - 1
										? '1px solid rgba(255,255,255,0.05)'
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
							<FigmaIconBox color={color} size={40}>
								<FileText size={17} color={color} strokeWidth={1.8} />
							</FigmaIconBox>
							<div style={{ flex: 1 }}>
								<div
									style={{
										display: 'flex',
										gap: 7,
										alignItems: 'center',
										marginBottom: 3,
									}}
								>
									<p
										style={{
											color: FC.fg,
											fontSize: 14,
											fontWeight: 500,
											margin: 0,
										}}
									>
										{report.title}
									</p>
									{!ok ? (
										<div
											style={{
												width: 6,
												height: 6,
												borderRadius: 3,
												background: FC.amber,
											}}
										/>
									) : null}
								</div>
								<p style={{ color: FC.mid, fontSize: 12.5, margin: 0 }}>
									{report.displayDate}
								</p>
							</div>
							<div
								style={{
									background: FC.ghost,
									borderRadius: 8,
									padding: '3px 9px',
								}}
							>
								<span style={{ color: FC.dim, fontSize: 11 }}>
									{memberName ?? 'Member'}
								</span>
							</div>
						</button>
					)
				})}
			</div>
		</div>
	)
}

export function FigmaHealthTimelineView({
	events,
}: {
	events: HealthJourneyEvent[]
}) {
	return (
		<div style={{ position: 'relative' }}>
			<div
				style={{
					position: 'absolute',
					left: 42,
					top: 8,
					bottom: 8,
					width: 1,
					background:
						'linear-gradient(to bottom,transparent,rgba(255,255,255,0.07) 15%,rgba(255,255,255,0.07) 85%,transparent)',
				}}
			/>
			{events.map((event, index) => {
				const color = figmaJourneyEventColor(event.kind)
				const dateLabel = event.displayDate.replace(' ', '\n')

				return (
					<div
						key={event.id}
						style={{
							display: 'flex',
							gap: 14,
							alignItems: 'flex-start',
							marginBottom: index < events.length - 1 ? 20 : 0,
						}}
					>
						<div
							style={{
								width: 30,
								flexShrink: 0,
								paddingTop: 2,
								textAlign: 'right',
							}}
						>
							<span
								style={{
									color: FC.ghost,
									fontSize: 10,
									fontWeight: 600,
									letterSpacing: '0.04em',
									lineHeight: 1.2,
									whiteSpace: 'pre-line',
								}}
							>
								{dateLabel}
							</span>
						</div>
						<div
							style={{
								width: 16,
								display: 'flex',
								justifyContent: 'center',
								flexShrink: 0,
								paddingTop: 5,
							}}
						>
							<div
								style={{
									width: 8,
									height: 8,
									borderRadius: 4,
									background: color,
									boxShadow: `0 0 0 3px ${color}20`,
								}}
							/>
						</div>
						<div
							style={{
								...figmaCardStyle,
								flex: 1,
								borderRadius: 18,
								padding: '14px 16px',
							}}
						>
							<p
								style={{
									color: FC.fg,
									fontSize: 14,
									fontWeight: 600,
									letterSpacing: -0.3,
									marginBottom: 4,
									marginTop: 0,
								}}
							>
								{event.title}
							</p>
							<p
								style={{
									color: FC.mid,
									fontSize: 13,
									lineHeight: 1.5,
									margin: 0,
								}}
							>
								{event.summary}
							</p>
						</div>
					</div>
				)
			})}
		</div>
	)
}

export function FigmaHealthMetricsView({
	companion,
}: {
	companion: HealthCompanionView
}) {
	const metrics = companion.metricGroups.flatMap((group) => group.metrics)

	return (
		<div style={{ ...figmaCardStyle, borderRadius: 22, overflow: 'hidden' }}>
			{metrics.map((metric, index) => (
				<div
					key={metric.id}
					style={{
						display: 'flex',
						alignItems: 'center',
						padding: '14px 20px',
						borderBottom:
							index < metrics.length - 1
								? '1px solid rgba(255,255,255,0.05)'
								: 'none',
					}}
				>
					<span style={{ flex: 1, color: FC.mid, fontSize: 14 }}>
						{metric.name}
					</span>
					<div style={{ textAlign: 'right' }}>
						<p
							style={{
								color: FC.fg,
								fontSize: 15,
								fontWeight: 600,
								letterSpacing: -0.3,
								marginBottom: 2,
								marginTop: 0,
							}}
						>
							{metric.value}
						</p>
						<p
							style={{
								color: figmaMetricStatusColor(metric.status),
								fontSize: 11.5,
								margin: 0,
							}}
						>
							{metric.trendLabel || figmaMetricStatusLabel(metric.status)}
						</p>
					</div>
				</div>
			))}
		</div>
	)
}

const INSIGHT_COLORS = [FC.amber, FC.green, FC.blue]

export function FigmaHealthInsightsView({
	paragraphs,
}: {
	paragraphs: string[]
}) {
	const navigate = useNavigate()

	return (
		<div>
			{paragraphs.map((paragraph, index) => {
				const color = INSIGHT_COLORS[index % INSIGHT_COLORS.length] ?? FC.blue
				const [headline, ...rest] = paragraph.split('. ')
				const body = rest.join('. ')

				return (
					<div
						key={`${index}-${headline}`}
						style={{
							...figmaCardStyle,
							borderRadius: 22,
							padding: '20px 20px',
							marginBottom: 12,
						}}
					>
						<div
							style={{
								display: 'flex',
								gap: 10,
								alignItems: 'flex-start',
								marginBottom: 10,
							}}
						>
							<div
								style={{
									width: 10,
									height: 10,
									borderRadius: 5,
									background: color,
									flexShrink: 0,
									marginTop: 4,
								}}
							/>
							<p
								style={{
									color: FC.fg,
									fontSize: 15,
									fontWeight: 600,
									letterSpacing: -0.3,
									lineHeight: 1.3,
									margin: 0,
								}}
							>
								{headline.endsWith('.') ? headline : `${headline}.`}
							</p>
						</div>
						{body ? (
							<p
								style={{
									color: FC.mid,
									fontSize: 13.5,
									lineHeight: 1.65,
									paddingLeft: 20,
									marginBottom: 14,
									marginTop: 0,
								}}
							>
								{body}
							</p>
						) : null}
						<button
							type="button"
							onClick={() =>
								navigate(`${ROUTES.ask}?q=${encodeURIComponent(paragraph)}`)
							}
							style={{
								marginLeft: 20,
								display: 'flex',
								alignItems: 'center',
								gap: 6,
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								padding: 0,
								fontFamily: 'inherit',
							}}
						>
							<Sparkles size={12} color={FC.blue} />
							<span style={{ color: FC.blue, fontSize: 12.5, fontWeight: 500 }}>
								Ask Chronicle about this
							</span>
						</button>
					</div>
				)
			})}
		</div>
	)
}
