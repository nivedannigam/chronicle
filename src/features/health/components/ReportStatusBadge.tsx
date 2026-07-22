import { C } from '@/constants/colors'
import { getHealthReportStatusLabel } from '@/features/health/services/health-processing.service'
import type { HealthReportStatus } from '@/features/health/types'

function statusColor(status: HealthReportStatus): string {
	switch (status) {
		case 'ready':
			return C.greenAlt
		case 'failed':
			return C.red
		case 'processing':
			return C.accentBlue
		default:
			return C.orange
	}
}

interface ReportStatusBadgeProps {
	status: HealthReportStatus
}

export function ReportStatusBadge({ status }: ReportStatusBadgeProps) {
	const color = statusColor(status)

	return (
		<span
			style={{
				fontSize: 10,
				fontWeight: 700,
				color,
				background: `${color}18`,
				borderRadius: 100,
				padding: '3px 8px',
				flexShrink: 0,
				letterSpacing: '0.02em',
			}}
		>
			{getHealthReportStatusLabel(status)}
		</span>
	)
}
