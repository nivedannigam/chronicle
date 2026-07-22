import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { healthReportPath } from '@/constants/routes'
import type { HealthReport } from '@/features/health/types'

interface ReportTimelineItemProps {
	report: HealthReport
	isLast: boolean
}

export function ReportTimelineItem({
	report,
	isLast,
}: ReportTimelineItemProps) {
	const navigate = useNavigate()

	return (
		<div
			style={{
				display: 'flex',
				gap: 14,
				marginBottom: isLast ? 0 : 16,
				position: 'relative',
				cursor: 'pointer',
			}}
			onClick={() => navigate(healthReportPath(report.id))}
		>
			<div
				style={{
					position: 'absolute',
					left: 7,
					top: 8,
					bottom: isLast ? 8 : -16,
					width: 1,
					background: isLast
						? 'transparent'
						: `linear-gradient(to bottom, ${C.accent}80, ${C.accent}00)`,
				}}
			/>
			<div
				style={{
					width: 15,
					flexShrink: 0,
					display: 'flex',
					justifyContent: 'center',
					paddingTop: 4,
				}}
			>
				<div
					style={{
						width: 7,
						height: 7,
						borderRadius: '50%',
						background: C.accent,
						boxShadow: `0 0 7px ${C.accent}`,
					}}
				/>
			</div>
			<div
				style={{
					flex: 1,
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 16,
					padding: '12px 14px',
					display: 'flex',
					alignItems: 'center',
					gap: 10,
				}}
			>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontSize: 11,
							color: C.textMuted,
							marginBottom: 4,
							fontWeight: 600,
						}}
					>
						{report.displayDate}
					</div>
					<div
						style={{
							fontSize: 14,
							fontWeight: 600,
							color: C.text,
							letterSpacing: '-0.01em',
						}}
					>
						{report.title}
					</div>
				</div>
				<ChevronRight size={16} color={C.textMuted} />
			</div>
		</div>
	)
}

interface ReportTimelineProps {
	reports: HealthReport[]
}

export function ReportTimeline({ reports }: ReportTimelineProps) {
	return (
		<div style={{ position: 'relative', paddingLeft: 0 }}>
			{reports.map((report, index) => (
				<ReportTimelineItem
					key={report.id}
					report={report}
					isLast={index === reports.length - 1}
				/>
			))}
		</div>
	)
}
