import { ChevronRight, Loader2, Upload } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { healthReportPath } from '@/constants/routes'
import { getHealthReportStatusLabel } from '@/features/health/services/health-processing.service'
import type {
	HealthUploadTimelineItem,
	UploadTimelineStatus,
} from '@/features/health/types'

function statusColor(status: UploadTimelineStatus): string {
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

function isActiveStatus(status: UploadTimelineStatus): boolean {
	return status === 'processing' || status === 'parsed' || status === 'queued'
}

interface HealthUploadTimelineProps {
	items: HealthUploadTimelineItem[]
}

export function HealthUploadTimeline({ items }: HealthUploadTimelineProps) {
	const navigate = useNavigate()

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
			{items.map((item) => {
				const clickable = item.status === 'completed' && item.reportId
				const color = statusColor(item.status)

				return (
					<div
						key={item.id}
						onClick={() => {
							if (clickable && item.reportId) {
								navigate(healthReportPath(item.reportId))
							}
						}}
						style={{
							background: C.card,
							border: `1px solid ${C.border}`,
							borderRadius: 16,
							padding: '14px 16px',
							display: 'flex',
							alignItems: 'center',
							gap: 12,
							cursor: clickable ? 'pointer' : 'default',
							opacity: item.status === 'uploaded' ? 0.85 : 1,
						}}
					>
						<div
							style={{
								width: 36,
								height: 36,
								borderRadius: 11,
								background: `${color}18`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								flexShrink: 0,
							}}
						>
							{isActiveStatus(item.status) ? (
								<Loader2
									size={16}
									color={color}
									style={{ animation: 'spin 1s linear infinite' }}
								/>
							) : item.status === 'uploaded' ? (
								<Upload size={16} color={color} />
							) : (
								<ChevronRight size={16} color={color} />
							)}
						</div>
						<div style={{ flex: 1, minWidth: 0 }}>
							<div
								style={{
									fontSize: 11,
									color: C.textMuted,
									marginBottom: 4,
									fontWeight: 600,
								}}
							>
								{item.displayDate}
							</div>
							<div
								style={{
									fontSize: 14,
									fontWeight: 600,
									color: C.text,
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
									marginBottom: 4,
								}}
							>
								{item.fileName}
							</div>
							<span
								style={{
									fontSize: 11,
									fontWeight: 700,
									color,
									background: `${color}18`,
									borderRadius: 100,
									padding: '3px 8px',
								}}
							>
								{getHealthReportStatusLabel(item.status)}
							</span>
						</div>
					</div>
				)
			})}
		</div>
	)
}
