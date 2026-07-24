import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Loader2 } from 'lucide-react'
import { C } from '@/constants/colors'
import { healthReportPath } from '@/constants/routes'
import { OcrProcessingDetails } from '@/features/health/components/OcrProcessingDetails'
import { ReportStatusBadge } from '@/features/health/components/ReportStatusBadge'
import {
	getTimelineDisplayDate,
	getTimelineTitle,
} from '@/features/health/services/health-timeline.service'
import { isProcessingStatus } from '@/features/health/services/health-processing.service'
import type { HealthTimelineItem } from '@/features/health/types'

interface ReportTimelineItemProps {
	item: HealthTimelineItem
	isLast: boolean
}

function ReportTimelineItem({ item, isLast }: ReportTimelineItemProps) {
	const navigate = useNavigate()
	const [openError, setOpenError] = useState<string | null>(null)

	const handleClick = () => {
		setOpenError(null)

		if (item.type === 'mock') {
			navigate(healthReportPath(item.report.id))
			return
		}

		if (item.report.status !== 'completed') {
			setOpenError(
				item.report.status === 'failed'
					? (item.report.processing_error ?? 'Processing failed.')
					: 'Report is still processing. Please wait.',
			)
			return
		}

		navigate(healthReportPath(item.report.id))
	}

	const isUpload = item.type === 'upload'

	return (
		<div style={{ marginBottom: isLast ? 0 : 16 }}>
			<div
				style={{
					display: 'flex',
					gap: 14,
					position: 'relative',
				}}
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
							background: isUpload ? C.teal : C.accent,
							boxShadow: `0 0 7px ${isUpload ? C.teal : C.accent}`,
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
						cursor: 'pointer',
					}}
					onClick={handleClick}
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
								{getTimelineDisplayDate(item)}
							</div>
							<div
								style={{
									fontSize: 14,
									fontWeight: 600,
									color: C.text,
									letterSpacing: '-0.01em',
									overflow: 'hidden',
									textOverflow: 'ellipsis',
									whiteSpace: 'nowrap',
									marginBottom: isUpload ? 6 : 0,
								}}
							>
								{getTimelineTitle(item)}
							</div>
							{isUpload ? (
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
									<ReportStatusBadge status={item.report.status} />
									{isProcessingStatus(item.report.status) ||
									item.report.status === 'queued' ? (
										<Loader2
											size={12}
											color={C.textMuted}
											style={{ animation: 'spin 1s linear infinite' }}
										/>
									) : null}
								</div>
							) : null}
						</div>
						<ChevronRight size={16} color={C.textMuted} />
					</div>
					{isUpload ? <OcrProcessingDetails report={item.report} /> : null}
				</div>
			</div>
			{openError ? (
				<p
					style={{
						marginTop: 6,
						marginLeft: 29,
						fontSize: 12,
						color: C.red,
					}}
				>
					{openError}
				</p>
			) : null}
		</div>
	)
}

interface ReportTimelineProps {
	items: HealthTimelineItem[]
	isLoading?: boolean
	errorMessage?: string | null
}

export function ReportTimeline({
	items,
	isLoading = false,
	errorMessage = null,
}: ReportTimelineProps) {
	if (isLoading) {
		return (
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					gap: 10,
					padding: '24px 0',
					color: C.textMuted,
					fontSize: 14,
				}}
			>
				<Loader2
					size={18}
					color={C.accent}
					style={{ animation: 'spin 1s linear infinite' }}
				/>
				Loading reports...
			</div>
		)
	}

	if (errorMessage) {
		return (
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 16,
					padding: '14px 16px',
					fontSize: 13,
					color: C.red,
					lineHeight: 1.5,
				}}
			>
				{errorMessage}
			</div>
		)
	}

	if (items.length === 0) {
		return (
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 16,
					padding: '14px 16px',
					fontSize: 13,
					color: C.textMuted,
					lineHeight: 1.5,
				}}
			>
				No reports yet. Upload a PDF to get started.
			</div>
		)
	}

	return (
		<div style={{ position: 'relative', paddingLeft: 0 }}>
			{items.map((item, index) => (
				<ReportTimelineItem
					key={
						item.type === 'mock'
							? `mock-${item.report.id}`
							: `upload-${item.report.id}`
					}
					item={item}
					isLast={index === items.length - 1}
				/>
			))}
		</div>
	)
}
