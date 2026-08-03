import { C } from '@/constants/colors'
import { getHealthReportStatusLabel } from '@/features/health/services/health-processing.service'
import type { ProductReportStatus } from '@/features/health/services/health-product.mapper'
import type { HealthReportStatus } from '@/features/health/types'

function pipelineStatusColor(status: HealthReportStatus): string {
	switch (status) {
		case 'completed':
			return C.greenAlt
		case 'failed':
			return C.red
		case 'processing':
		case 'parsed':
			return C.accentBlue
		case 'queued':
			return C.orange
		default:
			return C.textMuted
	}
}

function productStatusColor(status: ProductReportStatus | 'failed'): string {
	switch (status) {
		case 'ready':
			return C.greenAlt
		case 'organizing':
			return C.accentBlue
		case 'needs_help':
		case 'failed':
			return C.red
		default:
			return C.textMuted
	}
}

interface ReportStatusBadgeProps {
	status: HealthReportStatus
	label?: string
	productTone?: ProductReportStatus | 'failed'
}

export function ReportStatusBadge({
	status,
	label,
	productTone,
}: ReportStatusBadgeProps) {
	const color = productTone
		? productStatusColor(productTone)
		: pipelineStatusColor(status)

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
			{label ?? getHealthReportStatusLabel(status)}
		</span>
	)
}
