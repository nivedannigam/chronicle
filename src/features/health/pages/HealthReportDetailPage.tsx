import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Loader2, RefreshCw } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES, healthOcrPreviewPath } from '@/constants/routes'
import { ExtractedMetricsList } from '@/features/health/components/ExtractedMetricsList'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import {
	OcrReprocessBadge,
	LegacyOcrDataBanner,
} from '@/features/health/components/OcrStatusBanner'
import { OcrProcessingDetails } from '@/features/health/components/OcrProcessingDetails'
import { ProcessingDebugPanel } from '@/features/health/components/ProcessingDebugPanel'
import { useHealthReportDetail } from '@/features/health/hooks/useHealthReportDetail'
import {
	getReportDisplayDate,
	getReportDisplayTitle,
	hasLegacyApproximateOcr,
} from '@/features/health/services/health-parsed-report.service'
import { reprocessHealthReport } from '@/features/health/services/health-processing.service'
import { queryClient } from '@/lib/query-client'
import { uploadedHealthReportsQueryKey } from '@/features/health/hooks/useUploadedHealthReports'

export function HealthReportDetailPage() {
	const { reportId } = useParams<{ reportId: string }>()
	const navigate = useNavigate()
	const detail = useHealthReportDetail(reportId)
	const [isReprocessing, setIsReprocessing] = useState(false)

	if (detail.isLoading) {
		return (
			<div
				style={{ padding: '18px 18px 20px', color: C.textMuted, fontSize: 14 }}
			>
				Loading report...
			</div>
		)
	}

	if (!detail.source) {
		return <Navigate to={ROUTES.healthReports} replace />
	}

	const uploaded = detail.source.report
	const parsed = detail.parsed
	const showLegacyBanner = hasLegacyApproximateOcr(uploaded)
	const showFailedBanner = uploaded.status === 'failed'

	const handleReprocess = async () => {
		if (!reportId) {
			return
		}

		setIsReprocessing(true)

		try {
			await reprocessHealthReport(reportId)
			void queryClient.invalidateQueries({
				queryKey: uploadedHealthReportsQueryKey(uploaded.user_id),
			})
		} finally {
			setIsReprocessing(false)
		}
	}

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.healthReports)}
				style={{
					background: 'none',
					border: 'none',
					padding: 0,
					marginBottom: 20,
					cursor: 'pointer',
					color: C.textSec,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			>
				← Back to Reports
			</button>

			{showLegacyBanner ? <LegacyOcrDataBanner /> : null}
			{showFailedBanner && uploaded.processing_error ? (
				<div
					style={{
						background: 'rgba(255,69,58,0.08)',
						border: '1px solid rgba(255,69,58,0.2)',
						borderRadius: 14,
						padding: '12px 14px',
						fontSize: 13,
						color: C.red,
						lineHeight: 1.5,
						marginBottom: 16,
					}}
				>
					<strong>OCR failed</strong> — {uploaded.processing_error}
				</div>
			) : null}

			<div
				style={{
					fontSize: 28,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 8,
				}}
			>
				{getReportDisplayTitle(uploaded)}
			</div>
			<div style={{ fontSize: 13, color: C.textMuted, marginBottom: 8 }}>
				{uploaded.file_name}
			</div>
			<div style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>
				{getReportDisplayDate(uploaded, parsed)}
				{parsed ? ` · ${parsed.metadata.laboratory}` : ''}
			</div>

			<div
				style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}
			>
				<OcrReprocessBadge report={uploaded} />
				<button
					type="button"
					onClick={() => void handleReprocess()}
					disabled={isReprocessing}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						background: C.card2,
						border: `1px solid ${C.border}`,
						borderRadius: 100,
						padding: '8px 14px',
						fontSize: 12,
						fontWeight: 700,
						color: C.textSec,
						cursor: isReprocessing ? 'not-allowed' : 'pointer',
						fontFamily: 'inherit',
					}}
				>
					{isReprocessing ? (
						<Loader2
							size={14}
							style={{ animation: 'spin 1s linear infinite' }}
						/>
					) : (
						<RefreshCw size={14} />
					)}
					Reprocess
				</button>
				<button
					type="button"
					onClick={() => navigate(healthOcrPreviewPath(uploaded.id))}
					style={{
						background: C.accentDim,
						border: '1px solid rgba(108,111,255,0.25)',
						borderRadius: 100,
						padding: '8px 14px',
						fontSize: 12,
						fontWeight: 700,
						color: C.accent,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					View OCR Preview
				</button>
			</div>

			<HealthSectionHeader title="Document Processing" />
			<div style={{ marginBottom: 24 }}>
				<OcrProcessingDetails report={uploaded} />
			</div>

			{parsed ? (
				<>
					<HealthSectionHeader title="Report Information" />
					<div
						style={{
							background: C.card,
							border: `1px solid ${C.border}`,
							borderRadius: 18,
							padding: '16px',
							marginBottom: 24,
							fontSize: 13,
							color: C.textSec,
							lineHeight: 1.7,
						}}
					>
						{parsed.metadata.patientName ? (
							<div>Patient: {parsed.metadata.patientName}</div>
						) : null}
						{parsed.metadata.doctorName ? (
							<div>Doctor: {parsed.metadata.doctorName}</div>
						) : null}
						{parsed.metadata.referenceNumber ? (
							<div>Reference: {parsed.metadata.referenceNumber}</div>
						) : null}
						{parsed.metadata.collectionDate ? (
							<div>Collection Date: {parsed.metadata.collectionDate}</div>
						) : null}
						<div>Laboratory: {parsed.metadata.laboratory}</div>
						<div>
							{parsed.metrics.length} structured metrics extracted from OCR
							output.
						</div>
					</div>

					<HealthSectionHeader title="Extracted Metrics" />
					<div style={{ marginBottom: 24 }}>
						<ExtractedMetricsList metrics={detail.uiMetrics ?? []} />
					</div>

					{parsed.debug ? (
						<ProcessingDebugPanel
							debug={parsed.debug}
							rawOcrText={uploaded.extracted_text}
						/>
					) : null}
				</>
			) : (
				<div
					style={{
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 18,
						padding: '16px',
						fontSize: 14,
						color: C.textMuted,
					}}
				>
					Report processing is incomplete or parsed data is unavailable.
				</div>
			)}
		</div>
	)
}
