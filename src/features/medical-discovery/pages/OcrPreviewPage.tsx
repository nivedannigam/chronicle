import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { ExtractedMetricsList } from '@/features/health/components/ExtractedMetricsList'
import { OcrProcessingDetails } from '@/features/health/components/OcrProcessingDetails'
import { useHealthReportDetail } from '@/features/health/hooks/useHealthReportDetail'
import { formatReportTypeLabel } from '@/features/health/services/health-parsed-report.service'
import type { MetricStatus } from '@/features/health/types'

function mapMetricStatus(
	status: import('@/features/document-intelligence/domain/metric.types').MetricStatus,
): MetricStatus {
	switch (status) {
		case 'low':
			return 'low'
		case 'high':
		case 'borderline':
			return 'high'
		case 'critical':
			return 'critical'
		default:
			return 'normal'
	}
}

export function OcrPreviewPage() {
	const { reportId } = useParams<{ reportId: string }>()
	const navigate = useNavigate()
	const detail = useHealthReportDetail(reportId)

	if (detail.isLoading) {
		return (
			<div style={{ padding: 20, color: C.textMuted }}>
				Loading OCR preview…
			</div>
		)
	}

	if (!detail.source || detail.source.type !== 'uploaded') {
		return (
			<div style={{ padding: 20, color: C.textMuted }}>Report not found.</div>
		)
	}

	const report = detail.source.report
	const parsed = detail.parsed
	const confidence = report.ocr_confidence ?? 0
	const confidenceColor =
		confidence >= 0.85 ? C.greenAlt : confidence >= 0.6 ? C.orange : C.red

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() =>
					navigate(
						reportId
							? ROUTES.healthReport.replace(':reportId', reportId)
							: ROUTES.healthReports,
					)
				}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: 0,
					marginBottom: 16,
					cursor: 'pointer',
					color: C.textSec,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			>
				<ArrowLeft size={18} />
				Back
			</button>

			<div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
				OCR Preview
			</div>
			<div style={{ fontSize: 14, color: C.textSec, marginBottom: 16 }}>
				{report.file_name}
			</div>

			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 16,
					padding: 16,
					marginBottom: 16,
				}}
			>
				<div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
					OCR Confidence
				</div>
				<div style={{ fontSize: 24, fontWeight: 800, color: confidenceColor }}>
					{Math.round(confidence * 100)}%
				</div>
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: 10,
					marginBottom: 16,
				}}
			>
				<Meta label="Patient" value={parsed?.metadata?.patientName ?? '—'} />
				<Meta label="Hospital" value={parsed?.metadata?.laboratory || '—'} />
				<Meta label="Doctor" value={parsed?.metadata?.doctorName ?? '—'} />
				<Meta label="Report Date" value={report.report_date ?? '—'} />
				<Meta
					label="Report Type"
					value={formatReportTypeLabel(report.report_type ?? 'general')}
				/>
			</div>

			<OcrProcessingDetails report={report} />

			{parsed?.metrics?.length ? (
				<div style={{ marginTop: 16 }}>
					<div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
						Extracted Metrics
					</div>
					<ExtractedMetricsList
						metrics={parsed.metrics.map((metric) => ({
							name: metric.displayName,
							value: metric.value,
							reference: metric.referenceRange.rawText,
							status: mapMetricStatus(metric.status),
						}))}
					/>
				</div>
			) : null}

			{report.extracted_text ? (
				<div
					style={{
						marginTop: 16,
						background: C.card2,
						border: `1px solid ${C.border}`,
						borderRadius: 14,
						padding: 14,
						maxHeight: 280,
						overflowY: 'auto',
					}}
				>
					<div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
						Raw OCR Text
					</div>
					<pre
						style={{
							fontSize: 11,
							color: C.textSec,
							whiteSpace: 'pre-wrap',
							fontFamily: 'inherit',
							margin: 0,
						}}
					>
						{report.extracted_text.slice(0, 4000)}
					</pre>
				</div>
			) : null}
		</div>
	)
}

function Meta({ label, value }: { label: string; value: string }) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 12,
				padding: '10px 12px',
			}}
		>
			<div style={{ fontSize: 11, color: C.textMuted }}>{label}</div>
			<div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
				{value}
			</div>
		</div>
	)
}
