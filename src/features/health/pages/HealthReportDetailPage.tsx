import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Download, RefreshCw, Trash2 } from 'lucide-react'
import { C } from '@/constants/colors'
import { USER_VOCAB, formatReportStatus } from '@/constants/user-vocabulary'
import { ROUTES } from '@/constants/routes'
import { ListSkeleton } from '@/components/common/ListSkeleton'
import { ExtractedMetricsList } from '@/features/health/components/ExtractedMetricsList'
import { ReportStatusBadge } from '@/features/health/components/ReportStatusBadge'
import { HealthSectionLabel } from '@/features/health/components/companion/health-section-label'
import { useHealthReportDetail } from '@/features/health/hooks/useHealthReportDetail'
import {
	getReportDisplayDate,
	getReportDisplayTitle,
	formatReportTypeLabel,
} from '@/features/health/services/health-parsed-report.service'
import { getHealthReportSignedUrl } from '@/features/health/services/health-upload.service'
import { reprocessHealthReport } from '@/features/health/services/health-processing.service'
import { metricsDisplayMessage } from '@/features/health/services/report-readiness.service'
import { queryClient } from '@/lib/query-client'
import { uploadedHealthReportsQueryKey } from '@/features/health/hooks/useUploadedHealthReports'
import { supabase } from '@/lib/supabase'
import { HEALTH_REPORTS_BUCKET } from '@/features/health/types'
import { FigmaCard } from '@/ui/figma/components/primitives'
import {
	HealthActionChip,
	HealthAlertBanner,
	HealthMetaGrid,
	HealthScreen,
	HealthSubpageHeader,
} from '@/ui/figma/health/health-ui'

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
			<HealthScreen>
				<ListSkeleton rows={4} />
			</HealthScreen>
		)
	}

	if (!detail.source) {
		return <Navigate to={ROUTES.healthReports} replace />
	}

	const uploaded = detail.source.report
	const parsed = detail.parsed
	const uiMetrics = detail.uiMetrics ?? []
	const metricsMessage =
		uiMetrics.length === 0
			? metricsDisplayMessage({
					report: uploaded,
					storedMetricCount: uiMetrics.length,
				})
			: ''
	const showFailedBanner = uploaded.status === 'failed'
	const subtitle = [
		getReportDisplayDate(uploaded, parsed),
		parsed ? formatReportTypeLabel(parsed.metadata.reportType) : null,
	]
		.filter(Boolean)
		.join(' · ')

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
				error instanceof Error ? error.message : 'Could not refresh report.',
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
		<HealthScreen padding="0 18px 20px">
			<HealthSubpageHeader
				backLabel="Reports"
				onBack={() => navigate(ROUTES.healthReports)}
				title={getReportDisplayTitle(uploaded)}
				subtitle={subtitle}
				badge={<ReportStatusBadge status={uploaded.status} />}
			/>

			{showFailedBanner && uploaded.processing_error ? (
				<HealthAlertBanner
					message={`Import failed — ${uploaded.processing_error}`}
					actionLabel={
						isReprocessing
							? USER_VOCAB.actions.reprocessing
							: USER_VOCAB.actions.retryImport
					}
					onAction={() => void handleReprocess()}
					disabled={isReprocessing}
				/>
			) : null}

			<HealthMetaGrid
				rows={[
					{
						label: 'Hospital / Lab',
						value: parsed?.metadata.laboratory ?? '—',
					},
					{ label: 'Doctor', value: parsed?.metadata.doctorName ?? '—' },
					{ label: 'Source', value: reportSourceLabel(uploaded) },
					{ label: 'Status', value: formatReportStatus(uploaded.status) },
				]}
			/>

			<div
				style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}
			>
				<HealthActionChip
					icon={Download}
					label="Download original"
					onClick={() => void handleDownload()}
				/>
				<HealthActionChip
					icon={RefreshCw}
					label={
						isReprocessing
							? USER_VOCAB.actions.reprocessing
							: USER_VOCAB.actions.reprocess
					}
					onClick={() => void handleReprocess()}
					disabled={isReprocessing}
				/>
				<HealthActionChip
					icon={Trash2}
					label={isDeleting ? 'Deleting…' : 'Delete'}
					onClick={() => void handleDelete()}
					disabled={isDeleting}
					destructive
				/>
			</div>

			{actionError ? (
				<HealthAlertBanner message={actionError} tone="error" />
			) : null}

			{parsed ? (
				<>
					<HealthSectionLabel>
						{USER_VOCAB.sections.reportDetails}
					</HealthSectionLabel>
					<FigmaCard
						style={{
							padding: '14px 16px',
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
							{uiMetrics.length > 0
								? `${uiMetrics.length} result${uiMetrics.length === 1 ? '' : 's'} from this visit.`
								: metricsMessage}
						</div>
					</FigmaCard>

					<HealthSectionLabel>
						{USER_VOCAB.sections.extractedMetrics}
					</HealthSectionLabel>
					<div style={{ marginBottom: 24 }}>
						{uiMetrics.length > 0 ? (
							<ExtractedMetricsList metrics={uiMetrics} />
						) : (
							<FigmaCard
								style={{
									padding: '16px',
									fontSize: 14,
									color: C.textMuted,
								}}
							>
								{metricsMessage}
							</FigmaCard>
						)}
					</div>
				</>
			) : (
				<FigmaCard
					style={{
						padding: '16px',
						fontSize: 14,
						color: C.textMuted,
					}}
				>
					{metricsDisplayMessage({
						report: uploaded,
						storedMetricCount: 0,
					})}
				</FigmaCard>
			)}
		</HealthScreen>
	)
}
