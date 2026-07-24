import { useNavigate } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { C } from '@/constants/colors'
import { healthReportPath } from '@/constants/routes'
import type { ReportCardData } from '@/features/ask/types'

interface ReportCardProps {
	data: ReportCardData
}

export function ReportCard({ data }: ReportCardProps) {
	const navigate = useNavigate()

	return (
		<div
			onClick={() => navigate(healthReportPath(data.reportId))}
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 14,
				padding: '14px 16px',
				cursor: 'pointer',
			}}
		>
			<div
				style={{
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
						{data.date} · {data.lab}
					</div>
					<div
						style={{
							fontSize: 15,
							fontWeight: 600,
							color: C.text,
							marginBottom: 6,
						}}
					>
						{data.title}
					</div>
					<span
						style={{
							fontSize: 11,
							fontWeight: 700,
							color: C.teal,
							background: `${C.teal}18`,
							borderRadius: 100,
							padding: '3px 9px',
						}}
					>
						{data.category}
					</span>
					<div
						style={{
							fontSize: 13,
							color: C.textSec,
							lineHeight: 1.5,
							marginTop: 10,
						}}
					>
						{data.summary}
					</div>
				</div>
				<ChevronRight size={18} color={C.textMuted} />
			</div>
		</div>
	)
}
