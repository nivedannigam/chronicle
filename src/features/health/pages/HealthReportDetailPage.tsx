import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Download, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { ExtractedMetricsList } from '@/features/health/components/ExtractedMetricsList'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { useHealthReportDetail } from '@/features/health/hooks/useHealthReportDetail'
import {
	getReportDisplayDate,
	getReportDisplayTitle,
	formatReportTypeLabel,
} from '@/features/health/services/health-parsed-report.service'
import { getHealthReportSignedUrl } from '@/features/health/services/health-upload.service'
import { reprocessHealthReport } from '@/features/health/services/health-processing.service'
import { queryClient } from '@/lib/query-client'
import { uploadedHealthReportsQueryKey } from '@/features/health/hooks/useUploadedHealthReports'
import { supabase } from '@/lib/supabase'
import { HEALTH_REPORTS_BUCKET } from '@/features/health/types'

function reportSourceLabel(report: {
	source?: string
	external_file_id?: string | null
}): string {
	if (report.source === 'google-drive' || report.external_file_id) {
		return 'Google Drive'
	}

	return 'Manual upload'
}

export function HealthReportDetailPage() {
	const { reportId } = useParams<{ reportId: string }>()
	const navigate = useNavigate()
	const detail = useHealthReportDetail(reportId)
	const [isReprocessing, setIsReprocessing] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [actionError, setActionError] = useState<string | null>(null)

	if (detail.isLoading) {
		return (
			<div style={{ padding: '18px', color: C.textMuted, fontSize: 14 }}>
				Loading report…
			</div>
		)
	}

	if (!detail.source) {
		return <Navigate to={ROUTES.healthReports} replace />
	}

	const uploaded = detail.source.report
	const parsed = detail.parsed
	const showFailedBanner = uploaded.status === 'failed'

	const handleReprocess = async () => {
		if (!reportId) {
			return
		}

		setIsReprocessing(true)
		setActionError(null)

		try {
			await reprocessHealthReport(reportId)
			void queryClient.invalidateQueries({
				queryKey: uploadedHealthReportsQueryKey(uploaded.user_id),
			})
		} catch (error) {
			setActionError(
				error instanceof Error ? error.message : 'Reprocess failed.',
			)
		} finally {
			setIsReprocessing(false)
		}
	}

	const handleDownload = async () => {
		setActionError(null)

		try {
			const url = await getHealthReportSignedUrl(uploaded.storage_path)
			window.open(url, '_blank', 'noopener,noreferrer')
		} catch (error) {
			setActionError(
				error instanceof Error ? error.message : 'Could not download report.',
			)
		}
	}

	const handleDelete = async () => {
		const confirmed = window.confirm(
			'Delete this report permanently? This cannot be undone.',
		)

		if (!confirmed || !reportId) {
			return
		}

		setIsDeleting(true)
		setActionError(null)

		try {
			await supabase.from('health_reports').delete().eq('id', reportId)
			await supabase.storage
				.from(HEALTH_REPORTS_BUCKET)
				.remove([uploaded.storage_path])
			void queryClient.invalidateQueries({
				queryKey: uploadedHealthReportsQueryKey(uploaded.user_id),
			})
			navigate(ROUTES.healthReports)
		} catch (error) {
			setActionError(
				error instanceof Error ? error.message : 'Could not delete report.',
			)
		} finally {
			setIsDeleting(false)
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
					Processing failed — {uploaded.processing_error}
					<button
						type="button"
						onClick={() => void handleReprocess()}
						disabled={isReprocessing}
						style={{
							display: 'block',
							marginTop: 10,
							background: C.red,
							color: C.white,
							border: 'none',
							borderRadius: 100,
							padding: '8px 12px',
							fontSize: 12,
							fontWeight: 700,
							cursor: isReprocessing ? 'not-allowed' : 'pointer',
							fontFamily: 'inherit',
						}}
					>
						{isReprocessing ? 'Retrying…' : 'Retry processing'}
					</button>
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

			<div style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>
				{getReportDisplayDate(uploaded, parsed)}
				{parsed
					? ` · ${formatReportTypeLabel(parsed.metadata.reportType)}`
					: ''}
			</div>

			<div
				style={{
					display: 'grid',
					gap: 8,
					marginBottom: 20,
					fontSize: 13,
					color: C.textSec,
				}}
			>
				<div>Hospital / Lab: {parsed?.metadata.laboratory ?? '—'}</div>
				<div>Doctor: {parsed?.metadata.doctorName ?? '—'}</div>
				<div>Source: {reportSourceLabel(uploaded)}</div>
				<div>Status: {uploaded.status}</div>
			</div>

			<div
				style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}
			>
				<ActionButton
					icon={Download}
					label="Download original"
					onClick={() => void handleDownload()}
				/>
				<ActionButton
					icon={RefreshCw}
					label={isReprocessing ? 'Reprocessing…' : 'Reprocess'}
					onClick={() => void handleReprocess()}
					disabled={isReprocessing}
				/>
				<ActionButton
					icon={Trash2}
					label={isDeleting ? 'Deleting…' : 'Delete'}
					onClick={() => void handleDelete()}
					disabled={isDeleting}
					destructive
				/>
			</div>

			{actionError ? (
				<div style={{ fontSize: 13, color: C.red, marginBottom: 16 }}>
					{actionError}
				</div>
			) : null}

			{parsed ? (
				<>
					<HealthSectionHeader title="Report Details" />
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
						{parsed.metadata.referenceNumber ? (
							<div>Reference: {parsed.metadata.referenceNumber}</div>
						) : null}
						<div>
							{parsed.metrics.length} structured metrics extracted from this
							report.
						</div>
					</div>

					<HealthSectionHeader title="Extracted Metrics" />
					<div style={{ marginBottom: 24 }}>
						<ExtractedMetricsList metrics={detail.uiMetrics ?? []} />
					</div>
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
					{uploaded.status === 'completed'
						? 'No structured metrics were found in this report.'
						: 'Report is still processing. Check back shortly.'}
				</div>
			)}
		</div>
	)
}

function ActionButton({
	icon: Icon,
	label,
	onClick,
	disabled = false,
	destructive = false,
}: {
	icon: typeof Download
	label: string
	onClick: () => void
	disabled?: boolean
	destructive?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				background: destructive ? `${C.red}18` : C.card2,
				border: `1px solid ${destructive ? `${C.red}44` : C.border}`,
				borderRadius: 100,
				padding: '8px 14px',
				fontSize: 12,
				fontWeight: 700,
				color: destructive ? C.red : C.textSec,
				cursor: disabled ? 'not-allowed' : 'pointer',
				fontFamily: 'inherit',
				opacity: disabled ? 0.7 : 1,
			}}
		>
			{disabled && label.includes('…') ? (
				<Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
			) : (
				<Icon size={14} />
			)}
			{label}
		</button>
	)
}
