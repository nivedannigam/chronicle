import { useState } from 'react'
import { ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { C } from '@/constants/colors'
import { healthReportPath, ROUTES } from '@/constants/routes'
import { OcrReprocessBadge } from '@/features/health/components/OcrStatusBanner'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import {
	getParsedHealthReport,
	getReportDisplayDate,
	getReportDisplayTitle,
} from '@/features/health/services/health-parsed-report.service'
import { reprocessAllHealthReports } from '@/features/health/services/health-processing.service'
import { queryClient } from '@/lib/query-client'
import { uploadedHealthReportsQueryKey } from '@/features/health/hooks/useUploadedHealthReports'

export function HealthReportsPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const uploadedQuery = useUploadedHealthReports(user?.id)
	const reports = uploadedQuery.data ?? []
	const [isReprocessing, setIsReprocessing] = useState(false)
	const [reprocessMessage, setReprocessMessage] = useState<string | null>(null)

	const handleReprocessAll = async () => {
		if (!user?.id) {
			return
		}

		const confirmed = window.confirm(
			'Reprocess all imported reports?\n\nThis re-runs OCR and metric extraction with the latest parser. Use this after parser fixes without resetting your imports.',
		)

		if (!confirmed) {
			return
		}

		setIsReprocessing(true)
		setReprocessMessage(null)

		try {
			const result = await reprocessAllHealthReports(user.id)

			void queryClient.invalidateQueries({
				queryKey: uploadedHealthReportsQueryKey(user.id),
			})
			setReprocessMessage(
				`Reprocessed ${result.processed} report${result.processed === 1 ? '' : 's'}${result.failed > 0 ? ` (${result.failed} failed)` : ''}.`,
			)
		} catch (error) {
			setReprocessMessage(
				error instanceof Error ? error.message : 'Reprocess failed',
			)
		} finally {
			setIsReprocessing(false)
		}
	}

	return (
		<>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 14,
					lineHeight: 1.5,
				}}
			>
				All imported health reports and lab results in one place. After parser
				updates, use Reprocess all to refresh titles and metrics.
			</div>

			{reports.length > 0 ? (
				<button
					type="button"
					onClick={() => void handleReprocessAll()}
					disabled={isReprocessing}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 8,
						background: C.card2,
						border: `1px solid ${C.border}`,
						borderRadius: 100,
						padding: '8px 14px',
						fontSize: 12,
						fontWeight: 700,
						color: C.textSec,
						cursor: isReprocessing ? 'not-allowed' : 'pointer',
						fontFamily: 'inherit',
						marginBottom: reprocessMessage ? 8 : 16,
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
					Reprocess all reports
				</button>
			) : null}

			{reprocessMessage ? (
				<div style={{ fontSize: 12, color: C.textSec, marginBottom: 16 }}>
					{reprocessMessage}
				</div>
			) : null}

			<HealthSectionHeader title="All Reports" />

			{uploadedQuery.isLoading ? (
				<div style={{ color: C.textMuted, fontSize: 14, marginBottom: 28 }}>
					Loading reports…
				</div>
			) : reports.length === 0 ? (
				<DashboardEmptyState
					title="No reports imported"
					message="Import health reports from Google Drive to see them here."
					emoji="📄"
					actionLabel="Open Import Center"
					onAction={() => navigate(ROUTES.settingsImport)}
				/>
			) : (
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: 8,
						marginBottom: 28,
					}}
				>
					{reports.map((report) => {
						const parsed = getParsedHealthReport(report)
						const title = getReportDisplayTitle(report)
						const date = getReportDisplayDate(report, parsed)
						const lab = parsed?.metadata.laboratory ?? 'Unknown lab'

						return (
							<div
								key={report.id}
								onClick={() => navigate(healthReportPath(report.id))}
								style={{
									background: C.card,
									border: `1px solid ${C.border}`,
									borderRadius: 16,
									padding: '14px 16px',
									display: 'flex',
									alignItems: 'center',
									gap: 12,
									cursor: 'pointer',
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
										{date} · {lab}
									</div>
									<div
										style={{
											fontSize: 15,
											fontWeight: 600,
											color: C.text,
											marginBottom: 4,
										}}
									>
										{title}
									</div>
									<div
										style={{
											fontSize: 12,
											color: C.textSec,
											marginBottom: 8,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
										}}
									>
										{report.file_name}
									</div>
									<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
										<span
											style={{
												fontSize: 11,
												fontWeight: 700,
												color:
													report.status === 'completed' ? C.greenAlt : C.orange,
												background:
													report.status === 'completed'
														? `${C.greenAlt}18`
														: `${C.orange}18`,
												borderRadius: 100,
												padding: '3px 9px',
											}}
										>
											{report.status}
										</span>
										<OcrReprocessBadge report={report} />
									</div>
								</div>
								<ChevronRight size={18} color={C.textMuted} />
							</div>
						)
					})}
				</div>
			)}

			<HealthSectionHeader title="Compare Reports" />
			{reports.filter((report) => report.status === 'completed').length >= 2 ? (
				<div style={{ marginBottom: 16 }}>
					<button
						type="button"
						onClick={() => navigate(ROUTES.healthCompare)}
						style={{
							width: '100%',
							background: C.accentDim,
							border: `1px solid rgba(108,111,255,0.22)`,
							borderRadius: 14,
							padding: '12px 16px',
							fontSize: 14,
							fontWeight: 600,
							color: C.accent,
							cursor: 'pointer',
							fontFamily: 'inherit',
							marginBottom: 16,
						}}
					>
						Open Comparison View
					</button>
				</div>
			) : null}
		</>
	)
}
