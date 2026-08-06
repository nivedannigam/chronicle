import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Download, MessageCircle, RefreshCw, Trash2 } from 'lucide-react'
import { C } from '@/constants/colors'
import { USER_VOCAB } from '@/constants/user-vocabulary'
import { ROUTES, healthAskPath, healthVisitPath } from '@/constants/routes'
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
import {
	getProductReportStatusColor,
	getProductReportStatusLabel,
} from '@/features/health/services/health-product.mapper'
import { getHealthReportSignedUrl } from '@/features/health/services/health-upload.service'
import {
	reprocessHealthReport,
	reprocessHealthReportWithAi,
} from '@/features/health/services/health-processing.service'
import {
	AI_REPROCESS_CONFIRMATION,
	getHealthReportFailureMessage,
	reportEligibleForAiReprocess,
	reportFailedAtOcrStage,
	toAiReprocessUserFacingError,
} from '@/features/health/services/health-ai-extraction.service'
import { useReportHealthImpact } from '@/features/health/hooks/useReportHealthImpact'
import {
	buildReportFindingLabels,
	buildReportHealthImpact,
} from '@/features/health/services/health-report-impact.service'
import {
	metricsDisplayMessage,
	reportHasExtractedText,
} from '@/features/health/services/report-readiness.service'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import { supabase } from '@/lib/supabase'
import { HEALTH_REPORTS_BUCKET } from '@/features/health/types'
import { FigmaCard } from '@/ui/figma/components/primitives'
import {
	HealthActionChip,
	HealthAlertBanner,
	HealthScreen,
	HealthSubpageHeader,
} from '@/ui/figma/health/health-ui'
import { formatLaboratoryDisplayName } from '@/features/health/extraction/health-metadata.parser'
import { HealthConfirmSheet } from '@/ui/figma/health/HealthConfirmSheet'

function buildChronicleSummary(input: {
	metricCount: number
	hospital: string
	reportType: string
}): string {
	if (input.metricCount > 0) {
		return `Chronicle found ${input.metricCount} result${input.metricCount === 1 ? '' : 's'} from this ${input.reportType.toLowerCase()} at ${input.hospital}.`
	}

	return `This ${input.reportType.toLowerCase()} from ${input.hospital} is ready to review.`
}

export function HealthReportDetailPage() {
	const { reportId } = useParams<{ reportId: string }>()
	const navigate = useNavigate()
	const detail = useHealthReportDetail(reportId)
	const [isReprocessing, setIsReprocessing] = useState(false)
	const [isAiReprocessing, setIsAiReprocessing] = useState(false)
	const [isDeleting, setIsDeleting] = useState(false)
	const [actionError, setActionError] = useState<string | null>(null)
	const [showAdvanced, setShowAdvanced] = useState(false)
	const [confirmKind, setConfirmKind] = useState<'advanced' | 'delete' | null>(
		null,
	)
	const { snapshot: reportSnapshot, relatedVisitId } =
		useReportHealthImpact(reportId)

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
	const canReprocessWithAi = reportEligibleForAiReprocess(uploaded)
	const ocrFailed = showFailedBanner && reportFailedAtOcrStage(uploaded)
	const parsingFailed =
		showFailedBanner && !ocrFailed && reportHasExtractedText(uploaded)
	const failureMessage = showFailedBanner
		? getHealthReportFailureMessage(uploaded)
		: null
	const statusLabel = getProductReportStatusLabel(uploaded)
	const statusTone = getProductReportStatusColor(uploaded)
	const hospital = formatLaboratoryDisplayName(parsed?.metadata.laboratory)
	const reportType = parsed
		? formatReportTypeLabel(parsed.metadata.reportType)
		: 'Health report'
	const displayDate = getReportDisplayDate(uploaded, parsed)
	const healthImpact = buildReportHealthImpact(reportSnapshot)
	const findingLabels = buildReportFindingLabels(reportSnapshot)

	const invalidateHealthData = () => {
		invalidateAfterHealthImport(uploaded.user_id)
	}

	const handleReprocess = async () => {
		if (!reportId) {
			return
		}

		setIsReprocessing(true)
		setActionError(null)

		try {
			await reprocessHealthReport(reportId)
			invalidateHealthData()
		} catch (error) {
			setActionError(
				error instanceof Error
					? USER_VOCAB.messages.couldNotUnderstand
					: USER_VOCAB.messages.couldNotUnderstand,
			)
		} finally {
			setIsReprocessing(false)
		}
	}

	const handleReprocessWithAi = async () => {
		if (!reportId || !canReprocessWithAi) {
			return
		}

		setIsAiReprocessing(true)
		setActionError(null)

		try {
			await reprocessHealthReportWithAi(reportId)
			invalidateHealthData()
		} catch (error) {
			setActionError(toAiReprocessUserFacingError(error))
		} finally {
			setIsAiReprocessing(false)
			setConfirmKind(null)
		}
	}

	const handleDownload = async () => {
		setActionError(null)

		try {
			const url = await getHealthReportSignedUrl(uploaded.storage_path)
			window.open(url, '_blank', 'noopener,noreferrer')
		} catch {
			setActionError('Could not open this report right now.')
		}
	}

	const handleDelete = async () => {
		if (!reportId) {
			return
		}

		setIsDeleting(true)
		setActionError(null)

		try {
			await supabase.from('health_reports').delete().eq('id', reportId)
			await supabase.storage
				.from(HEALTH_REPORTS_BUCKET)
				.remove([uploaded.storage_path])
			invalidateHealthData()
			navigate(ROUTES.healthReports)
		} catch {
			setActionError('Could not delete this report.')
		} finally {
			setIsDeleting(false)
			setConfirmKind(null)
		}
	}

	return (
		<HealthScreen padding="0 18px 20px">
			<HealthSubpageHeader
				backLabel="Reports"
				onBack={() => navigate(ROUTES.healthReports)}
				title={getReportDisplayTitle(uploaded)}
				subtitle={`${displayDate} · ${reportType}`}
				badge={
					<ReportStatusBadge
						status={uploaded.status}
						label={statusLabel}
						productTone={statusTone}
					/>
				}
			/>

			{showFailedBanner && failureMessage ? (
				<HealthAlertBanner
					message={failureMessage}
					actionLabel={
						(ocrFailed || parsingFailed) && canReprocessWithAi
							? isAiReprocessing
								? USER_VOCAB.actions.advancedReadingBusy
								: USER_VOCAB.actions.tryAgain
							: isReprocessing
								? USER_VOCAB.actions.reprocessing
								: USER_VOCAB.actions.tryAgain
					}
					onAction={() =>
						void ((ocrFailed || parsingFailed) && canReprocessWithAi
							? setConfirmKind('advanced')
							: handleReprocess())
					}
					disabled={isReprocessing || isAiReprocessing}
				/>
			) : null}

			<FigmaCard
				style={{
					padding: '20px 18px',
					marginBottom: 20,
					borderRadius: 22,
				}}
			>
				<p
					style={{
						color: C.textMuted,
						fontSize: 11,
						fontWeight: 600,
						textTransform: 'uppercase',
						letterSpacing: 0.6,
						margin: '0 0 6px',
					}}
				>
					{hospital || 'Health report'}
				</p>
				<p
					style={{
						color: C.text,
						fontSize: 15,
						lineHeight: 1.6,
						margin: '0 0 14px',
					}}
				>
					{buildChronicleSummary({
						metricCount: uiMetrics.length,
						hospital: hospital || 'your lab',
						reportType,
					})}
				</p>
				<button
					type="button"
					onClick={() =>
						navigate(
							healthAskPath({
								q: `Summarize my ${reportType.toLowerCase()} from ${displayDate}.`,
								reportId: uploaded.id,
							}),
						)
					}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 8,
						background: C.accentBlue,
						border: 'none',
						borderRadius: 12,
						padding: '10px 16px',
						color: '#fff',
						fontSize: 13,
						fontWeight: 700,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					<MessageCircle size={15} />
					{USER_VOCAB.actions.askAboutReport}
				</button>
			</FigmaCard>

			{healthImpact ? (
				<>
					<HealthSectionLabel>
						{USER_VOCAB.sections.healthImpact}
					</HealthSectionLabel>
					<FigmaCard
						style={{
							padding: '16px 18px',
							marginBottom: 20,
							borderRadius: 18,
							fontSize: 14,
							color: C.textSec,
							lineHeight: 1.65,
						}}
					>
						{healthImpact}
					</FigmaCard>
				</>
			) : null}

			{findingLabels.length > 0 ? (
				<>
					<HealthSectionLabel>
						{USER_VOCAB.sections.extractedMetrics}
					</HealthSectionLabel>
					<div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
						{findingLabels.map((label) => (
							<FigmaCard
								key={label}
								style={{
									padding: '14px 16px',
									fontSize: 13.5,
									color: C.textSec,
								}}
							>
								{label}
							</FigmaCard>
						))}
					</div>
				</>
			) : null}

			{relatedVisitId ? (
				<button
					type="button"
					onClick={() => navigate(healthVisitPath(relatedVisitId))}
					style={{
						width: '100%',
						background: 'none',
						border: `1px solid ${C.border}`,
						borderRadius: 14,
						padding: '12px 16px',
						color: C.textSec,
						fontSize: 13,
						fontWeight: 600,
						cursor: 'pointer',
						fontFamily: 'inherit',
						marginBottom: 20,
						textAlign: 'left',
					}}
				>
					View related visit →
				</button>
			) : null}

			{actionError ? (
				<HealthAlertBanner message={actionError} tone="error" />
			) : null}

			{uiMetrics.length > 0 ? (
				<>
					<HealthSectionLabel>All results</HealthSectionLabel>
					<div style={{ marginBottom: 24 }}>
						<ExtractedMetricsList metrics={uiMetrics} />
					</div>
				</>
			) : metricsMessage ? (
				<FigmaCard
					style={{
						padding: '16px',
						fontSize: 14,
						color: C.textMuted,
						marginBottom: 24,
					}}
				>
					{metricsMessage}
				</FigmaCard>
			) : null}

			<HealthSectionLabel>{USER_VOCAB.sections.advanced}</HealthSectionLabel>
			<button
				type="button"
				onClick={() => setShowAdvanced((open) => !open)}
				style={{
					...{
						width: '100%',
						textAlign: 'left',
						cursor: 'pointer',
						fontFamily: 'inherit',
						marginBottom: showAdvanced ? 12 : 24,
					},
					background: 'none',
					border: 'none',
					color: C.textSec,
					fontSize: 13,
					padding: 0,
				}}
			>
				{showAdvanced ? 'Hide options' : 'Show options'}
			</button>

			{showAdvanced ? (
				<div
					style={{
						display: 'flex',
						gap: 8,
						flexWrap: 'wrap',
						marginBottom: 24,
					}}
				>
					<HealthActionChip
						icon={Download}
						label={USER_VOCAB.actions.downloadOriginal}
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
						disabled={isReprocessing || isAiReprocessing}
					/>
					{canReprocessWithAi ? (
						<HealthActionChip
							icon={RefreshCw}
							label={
								isAiReprocessing
									? USER_VOCAB.actions.advancedReadingBusy
									: USER_VOCAB.actions.advancedReading
							}
							onClick={() => setConfirmKind('advanced')}
							disabled={isReprocessing || isAiReprocessing}
						/>
					) : null}
					<HealthActionChip
						icon={Trash2}
						label={isDeleting ? 'Deleting…' : USER_VOCAB.actions.deleteReport}
						onClick={() => setConfirmKind('delete')}
						disabled={isDeleting}
						destructive
					/>
				</div>
			) : null}

			<HealthConfirmSheet
				isOpen={confirmKind === 'advanced'}
				title={USER_VOCAB.actions.advancedReading}
				message={AI_REPROCESS_CONFIRMATION}
				confirmLabel={USER_VOCAB.actions.advancedReading}
				onConfirm={() => void handleReprocessWithAi()}
				onCancel={() => setConfirmKind(null)}
				isBusy={isAiReprocessing}
			/>
			<HealthConfirmSheet
				isOpen={confirmKind === 'delete'}
				title="Delete this report?"
				message="This report will be permanently removed from Chronicle. This cannot be undone."
				confirmLabel="Delete"
				onConfirm={() => void handleDelete()}
				onCancel={() => setConfirmKind(null)}
				isBusy={isDeleting}
				destructive
			/>
		</HealthScreen>
	)
}
