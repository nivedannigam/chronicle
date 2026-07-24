import { C } from '@/constants/colors'
import { formatDuration } from '@/features/health-import/services/import-summary.service'
import type { HealthImportSummary } from '@/features/health-import/types/health-import.types'

interface ImportSummaryCardProps {
	summary: HealthImportSummary
}

export function ImportSummaryCard({ summary }: ImportSummaryCardProps) {
	const stats = [
		{ label: 'Reports Imported', value: String(summary.reportsImported) },
		{ label: 'Metrics Extracted', value: String(summary.metricsExtracted) },
		{ label: 'Years of History', value: String(summary.yearsCovered) },
		{ label: 'Timeline Events', value: String(summary.timelineEvents) },
		{ label: 'Health Categories', value: String(summary.categoriesCount) },
		{ label: 'Duration', value: formatDuration(summary.durationMs) },
	]

	return (
		<div
			style={{
				background: `linear-gradient(135deg, ${C.accentDim}, rgba(52,211,153,0.08))`,
				border: `1px solid rgba(108,111,255,0.25)`,
				borderRadius: 20,
				padding: 20,
				marginBottom: 20,
			}}
		>
			<div
				style={{
					fontSize: 22,
					fontWeight: 800,
					color: C.text,
					marginBottom: 6,
				}}
			>
				Health Import Complete
			</div>
			<div style={{ fontSize: 13, color: C.textSec, marginBottom: 18 }}>
				{summary.firstReportDate && summary.latestReportDate
					? `${summary.firstReportDate} → ${summary.latestReportDate}`
					: 'Your health history is ready.'}
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: 10,
					marginBottom: 16,
				}}
			>
				{stats.map((stat) => (
					<div
						key={stat.label}
						style={{
							background: C.card,
							borderRadius: 14,
							padding: '12px 14px',
							border: `1px solid ${C.border}`,
						}}
					>
						<div style={{ fontSize: 10, color: C.textMuted, marginBottom: 4 }}>
							{stat.label}
						</div>
						<div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>
							{stat.value}
						</div>
					</div>
				))}
			</div>

			<div
				style={{
					fontSize: 14,
					fontWeight: 700,
					color: C.accent,
					textAlign: 'center',
				}}
			>
				Ready to Ask Chronicle
			</div>
		</div>
	)
}
