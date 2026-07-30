import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { BottomSheet } from '@/components/layout/mobile'
import { C } from '@/constants/colors'
import { healthOcrPreviewPath, healthReportPath } from '@/constants/routes'
import type { HealthObservation } from '@/features/health-knowledge/types'

interface MetricSourcePanelProps {
	observation: HealthObservation
	metricLabel: string
	onClose: () => void
}

export function MetricSourcePanel({
	observation,
	metricLabel,
	onClose,
}: MetricSourcePanelProps) {
	const navigate = useNavigate()

	return (
		<BottomSheet
			isOpen
			onClose={onClose}
			maxWidth={480}
			aria-label={`${metricLabel} source`}
			header={
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
					}}
				>
					<div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>
						{metricLabel} Source
					</div>
					<button
						type="button"
						onClick={onClose}
						style={{
							background: 'none',
							border: 'none',
							color: C.textMuted,
							cursor: 'pointer',
							padding: 4,
						}}
					>
						<X size={20} />
					</button>
				</div>
			}
			footer={
				<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
					<button
						type="button"
						onClick={() => navigate(healthReportPath(observation.reportId))}
						style={actionButtonStyle}
					>
						Open Original Report
					</button>
					<button
						type="button"
						onClick={() => navigate(healthOcrPreviewPath(observation.reportId))}
						style={secondaryActionStyle}
					>
						Highlighted OCR
					</button>
				</div>
			}
		>
			<SourceRow label="Value" value={observation.value} />
			<SourceRow label="Status" value={observation.status} />
			<SourceRow
				label="Confidence"
				value={`${Math.round(observation.confidence * 100)}%`}
			/>
			<SourceRow
				label="Reference Range"
				value={observation.referenceRange || '—'}
			/>
			<SourceRow
				label="Report Date"
				value={formatDate(observation.observedAt)}
			/>
			<SourceRow label="Laboratory" value={observation.laboratory || '—'} />
			<SourceRow label="Report" value={observation.reportTitle} />
			<SourceRow label="Raw Metric Name" value={observation.rawName} />
		</BottomSheet>
	)
}

function SourceRow({ label, value }: { label: string; value: string }) {
	return (
		<div style={{ marginBottom: 10 }}>
			<div
				style={{
					fontSize: 10,
					fontWeight: 700,
					textTransform: 'uppercase',
					letterSpacing: '0.08em',
					color: C.textMuted,
					marginBottom: 3,
				}}
			>
				{label}
			</div>
			<div style={{ fontSize: 14, color: C.textSec, lineHeight: 1.5 }}>
				{value}
			</div>
		</div>
	)
}

function formatDate(value: string) {
	return new Date(value).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

const actionButtonStyle: CSSProperties = {
	background: C.accent,
	border: 'none',
	borderRadius: 100,
	padding: '10px 16px',
	fontSize: 13,
	fontWeight: 700,
	color: C.white,
	cursor: 'pointer',
	fontFamily: 'inherit',
	flex: 1,
	minHeight: 44,
}

const secondaryActionStyle: CSSProperties = {
	background: C.accentDim,
	border: '1px solid rgba(108,111,255,0.25)',
	borderRadius: 100,
	padding: '10px 16px',
	fontSize: 13,
	fontWeight: 700,
	color: C.accent,
	cursor: 'pointer',
	fontFamily: 'inherit',
	flex: 1,
	minHeight: 44,
}
