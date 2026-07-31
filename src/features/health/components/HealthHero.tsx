import { C } from '@/constants/colors'
import { sectionLabelStyle } from '@/features/health/types/health.types'
import type { HealthDashboard, HealthReport } from '@/features/health/types'

interface HealthHeroProps {
	dashboard: HealthDashboard
	latestReport: HealthReport | undefined
	onLatestReportClick?: () => void
}

export function HealthHero({
	dashboard,
	latestReport,
	onLatestReportClick,
}: HealthHeroProps) {
	const r = 40
	const cx = 48
	const cy = 48
	const circ = 2 * Math.PI * r
	const displayScore = dashboard.score
	const offset =
		displayScore === null ? circ : circ - (displayScore / 100) * circ

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid rgba(108,111,255,0.25)`,
				borderRadius: 20,
				padding: '20px 18px',
				marginBottom: 24,
				boxShadow: `0 0 32px rgba(108,111,255,0.10)`,
			}}
		>
			<div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
				<svg
					width={96}
					height={96}
					viewBox="0 0 96 96"
					style={{ flexShrink: 0 }}
				>
					<circle
						cx={cx}
						cy={cy}
						r={r}
						fill="none"
						stroke="rgba(255,255,255,0.08)"
						strokeWidth={7}
					/>
					<circle
						cx={cx}
						cy={cy}
						r={r}
						fill="none"
						stroke={C.greenAlt}
						strokeWidth={7}
						strokeDasharray={circ}
						strokeDashoffset={offset}
						strokeLinecap="round"
						transform={`rotate(-90 ${cx} ${cy})`}
					/>
					<text
						x={cx}
						y={cy + 2}
						textAnchor="middle"
						dominantBaseline="middle"
						fill="white"
						fontSize="22"
						fontWeight="700"
						fontFamily="system-ui"
					>
						{displayScore ?? '—'}
					</text>
				</svg>
				<div style={{ flex: 1 }}>
					<div style={{ ...sectionLabelStyle, marginBottom: 6 }}>
						Health Score
					</div>
					<div
						style={{
							fontSize: 18,
							fontWeight: 700,
							color: C.text,
							marginBottom: 6,
							letterSpacing: '-0.01em',
							lineHeight: 1.3,
						}}
					>
						{dashboard.overallStatus}
					</div>
					<div style={{ fontSize: 12, color: C.textMuted }}>
						Last updated · {dashboard.lastUpdated}
					</div>
				</div>
			</div>

			{latestReport ? (
				<button
					type="button"
					onClick={onLatestReportClick}
					style={{
						width: '100%',
						marginTop: 18,
						padding: '14px 16px',
						background: 'rgba(255,255,255,0.04)',
						border: `1px solid ${C.border}`,
						borderRadius: 14,
						cursor: 'pointer',
						textAlign: 'left',
						fontFamily: 'inherit',
					}}
				>
					<div style={{ ...sectionLabelStyle, marginBottom: 6 }}>
						Latest Report
					</div>
					<div
						style={{
							fontSize: 15,
							fontWeight: 600,
							color: C.text,
							marginBottom: 4,
						}}
					>
						{latestReport.title}
					</div>
					<div style={{ fontSize: 12, color: C.textMuted }}>
						{latestReport.displayDate} · {latestReport.lab}
					</div>
				</button>
			) : null}
		</div>
	)
}
