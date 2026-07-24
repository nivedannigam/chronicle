import { C } from '@/constants/colors'

export interface HealthSummaryStats {
	lastScanAt: string | null
	reportsImported: number
	latestReportTitle: string | null
	latestReportDate: string | null
	healthScore: number | null
	metricsExtracted: number
	timelineEntries: number
	hasImportedReports: boolean
}

interface HealthSummaryBarProps {
	stats: HealthSummaryStats
	onValidationClick?: () => void
}

export function HealthSummaryBar({
	stats,
	onValidationClick,
}: HealthSummaryBarProps) {
	if (!stats.hasImportedReports) {
		return null
	}

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid rgba(108,111,255,0.22)`,
				borderRadius: 18,
				padding: '16px 16px 14px',
				marginBottom: 22,
				boxShadow: '0 0 24px rgba(108,111,255,0.08)',
			}}
		>
			<div
				style={{
					fontSize: 11,
					fontWeight: 700,
					textTransform: 'uppercase',
					letterSpacing: '0.08em',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Health Summary
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(2, 1fr)',
					gap: 10,
					marginBottom: 12,
				}}
			>
				<SummaryTile
					label="Last Scan"
					value={stats.lastScanAt ? formatRelative(stats.lastScanAt) : 'Never'}
				/>
				<SummaryTile
					label="Reports Imported"
					value={String(stats.reportsImported)}
				/>
				<SummaryTile
					label="Latest Report"
					value={stats.latestReportTitle ?? 'None'}
					sub={stats.latestReportDate ?? undefined}
				/>
				<SummaryTile
					label="Health Score"
					value={stats.healthScore != null ? String(stats.healthScore) : '—'}
				/>
			</div>

			<div
				style={{
					display: 'flex',
					gap: 8,
					fontSize: 11,
					color: C.textMuted,
					flexWrap: 'wrap',
				}}
			>
				<span>{stats.metricsExtracted} metrics extracted</span>
				<span>·</span>
				<span>{stats.timelineEntries} timeline entries</span>
				{onValidationClick ? (
					<>
						<span>·</span>
						<button
							type="button"
							onClick={onValidationClick}
							style={{
								background: 'none',
								border: 'none',
								padding: 0,
								color: C.accent,
								fontWeight: 700,
								cursor: 'pointer',
								fontFamily: 'inherit',
								fontSize: 11,
							}}
						>
							Run Validation
						</button>
					</>
				) : null}
			</div>
		</div>
	)
}

function SummaryTile({
	label,
	value,
	sub,
}: {
	label: string
	value: string
	sub?: string
}) {
	return (
		<div
			style={{
				background: 'rgba(255,255,255,0.03)',
				borderRadius: 12,
				padding: '10px 12px',
				minWidth: 0,
			}}
		>
			<div
				style={{
					fontSize: 10,
					color: C.textMuted,
					marginBottom: 4,
					fontWeight: 600,
				}}
			>
				{label}
			</div>
			<div
				style={{
					fontSize: 14,
					fontWeight: 700,
					color: C.text,
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					whiteSpace: 'nowrap',
				}}
			>
				{value}
			</div>
			{sub ? (
				<div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
					{sub}
				</div>
			) : null}
		</div>
	)
}

function formatRelative(iso: string) {
	const diff = Date.now() - Date.parse(iso)
	const hours = Math.floor(diff / 3_600_000)

	if (hours < 1) {
		return 'Just now'
	}

	if (hours < 24) {
		return `${hours}h ago`
	}

	const days = Math.floor(hours / 24)
	return `${days}d ago`
}
