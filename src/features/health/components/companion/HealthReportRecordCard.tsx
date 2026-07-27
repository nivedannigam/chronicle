import { useNavigate } from 'react-router-dom'
import { MessageCircle, ChevronRight } from 'lucide-react'
import { C } from '@/constants/colors'
import { healthReportPath, ROUTES } from '@/constants/routes'
import { HealthSectionLabel } from '@/features/health/components/companion/health-section-label'
import type { HealthReportSummary } from '@/features/health/types/health-companion.types'
import { FigmaCard } from '@/ui/figma/components/primitives'
import { healthPrimaryButtonStyle } from '@/ui/figma/health/health-ui.styles'

interface HealthReportRecordCardProps {
	report: HealthReportSummary
	showActions?: boolean
}

export function HealthReportRecordCard({
	report,
	showActions = true,
}: HealthReportRecordCardProps) {
	const navigate = useNavigate()

	return (
		<FigmaCard style={{ padding: 16 }}>
			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					color: C.textMuted,
					marginBottom: 6,
				}}
			>
				{report.displayDate}
			</div>
			<div
				style={{
					fontSize: 16,
					fontWeight: 700,
					marginBottom: 6,
					lineHeight: 1.3,
				}}
			>
				{report.title}
			</div>
			<div style={{ fontSize: 13, color: C.textSec, marginBottom: 10 }}>
				{report.hospital}
				{report.doctor ? ` · Dr. ${report.doctor}` : ''}
			</div>
			<div
				style={{
					fontSize: 13,
					color: C.textSec,
					lineHeight: 1.5,
					marginBottom: report.findings.length > 0 ? 10 : 14,
				}}
			>
				{report.summary}
			</div>

			{report.findings.length > 0 ? (
				<div style={{ marginBottom: 14 }}>
					<div
						style={{
							fontSize: 11,
							fontWeight: 700,
							color: C.orange,
							marginBottom: 6,
						}}
					>
						Important findings
					</div>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
						{report.findings.map((finding) => (
							<span
								key={finding}
								style={{
									fontSize: 11,
									fontWeight: 600,
									color: C.orange,
									background: `${C.orange}12`,
									borderRadius: 100,
									padding: '4px 10px',
								}}
							>
								{finding}
							</span>
						))}
					</div>
				</div>
			) : null}

			{showActions ? (
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
					<button
						type="button"
						onClick={() => navigate(healthReportPath(report.id))}
						style={healthPrimaryButtonStyle}
					>
						View details
						<ChevronRight size={14} />
					</button>
					<button
						type="button"
						onClick={() =>
							navigate(
								`${ROUTES.ask}?q=${encodeURIComponent(`Summarize my ${report.title.toLowerCase()}`)}`,
							)
						}
						style={healthPrimaryButtonStyle}
					>
						<MessageCircle size={14} />
						Ask Chronicle
					</button>
				</div>
			) : null}
		</FigmaCard>
	)
}

interface HealthRecentReportsListProps {
	reports: HealthReportSummary[]
	limit?: number
	onViewAll?: () => void
}

export function HealthRecentReportsList({
	reports,
	limit = 3,
	onViewAll,
}: HealthRecentReportsListProps) {
	const visible = reports.slice(0, limit)

	if (visible.length === 0) {
		return null
	}

	return (
		<section style={{ marginBottom: 24 }}>
			<HealthSectionLabel>Recent reports</HealthSectionLabel>
			<div style={{ display: 'grid', gap: 10 }}>
				{visible.map((report) => (
					<HealthReportRecordCard key={report.id} report={report} />
				))}
			</div>
			{reports.length > limit && onViewAll ? (
				<button type="button" onClick={onViewAll} style={linkButtonStyle}>
					View all reports →
				</button>
			) : null}
		</section>
	)
}

const linkButtonStyle: React.CSSProperties = {
	marginTop: 10,
	background: 'none',
	border: 'none',
	padding: 0,
	fontSize: 13,
	fontWeight: 700,
	color: C.accent,
	cursor: 'pointer',
	fontFamily: 'inherit',
}
