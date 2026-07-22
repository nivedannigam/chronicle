import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { healthReportPath } from '@/constants/routes'
import type { HealthReport } from '@/features/health/types'

interface LatestReportCardProps {
	report: HealthReport
}

export function LatestReportCard({ report }: LatestReportCardProps) {
	const navigate = useNavigate()

	return (
		<button
			type="button"
			onClick={() => navigate(healthReportPath(report.id))}
			style={{
				width: '100%',
				background: C.card,
				border: `1px solid rgba(61,140,240,0.25)`,
				borderRadius: 18,
				padding: '16px',
				marginBottom: 12,
				cursor: 'pointer',
				textAlign: 'left',
				fontFamily: 'inherit',
				boxShadow: `0 0 24px rgba(61,140,240,0.08)`,
			}}
		>
			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 10,
				}}
			>
				Latest Report
			</div>
			<div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontSize: 16,
							fontWeight: 700,
							color: C.text,
							marginBottom: 4,
							letterSpacing: '-0.01em',
						}}
					>
						{report.title}
					</div>
					<div style={{ fontSize: 13, color: C.textMuted, marginBottom: 6 }}>
						{report.displayDate} · {report.lab}
					</div>
					<div
						style={{
							fontSize: 13,
							color: C.textSec,
							lineHeight: 1.45,
							overflow: 'hidden',
							display: '-webkit-box',
							WebkitLineClamp: 2,
							WebkitBoxOrient: 'vertical',
						}}
					>
						{report.summary}
					</div>
				</div>
				<ChevronRight size={18} color={C.textMuted} />
			</div>
		</button>
	)
}
