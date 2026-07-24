import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { ReportComparisonView } from '@/features/health/components/ReportComparisonView'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { getParsedHealthReport } from '@/features/health/services/health-parsed-report.service'
import { formatReportTypeLabel } from '@/features/health/services/health-parsed-report.service'

export function HealthComparePage() {
	const navigate = useNavigate()
	const uploadedQuery = useMemberHealthReports()
	const completedReports = (uploadedQuery.data ?? []).filter(
		(report) => report.status === 'completed',
	)

	const reportOptions = completedReports.map((report) => {
		const parsed = getParsedHealthReport(report)
		return {
			id: report.id,
			label: parsed
				? `${formatReportTypeLabel(parsed.metadata.reportType)} · ${parsed.metadata.reportDate ?? report.uploaded_at.slice(0, 10)}`
				: report.file_name,
		}
	})

	const [olderId, setOlderId] = useState(reportOptions[0]?.id ?? '')
	const [newerId, setNewerId] = useState(
		reportOptions[1]?.id ?? reportOptions[0]?.id ?? '',
	)

	if (!uploadedQuery.isLoading && completedReports.length < 2) {
		return (
			<div style={{ padding: '18px 18px 20px', color: C.text }}>
				<button
					type="button"
					onClick={() => navigate(ROUTES.healthReports)}
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
					Back
				</button>
				<DashboardEmptyState
					title="Comparison unavailable"
					message="Import at least two health reports to compare results side by side."
					emoji="⚖️"
					actionLabel="Go to Health Sources"
					onAction={() => navigate(ROUTES.healthSettings)}
				/>
			</div>
		)
	}

	const selectStyle = {
		width: '100%',
		background: C.card,
		border: `1px solid ${C.border}`,
		borderRadius: 12,
		padding: '11px 12px',
		fontSize: 14,
		color: C.text,
		fontFamily: 'inherit',
		marginBottom: 10,
	} as const

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.healthReports)}
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
				Back
			</button>

			<div
				style={{
					fontSize: 34,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 8,
				}}
			>
				Compare Reports
			</div>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 20,
					lineHeight: 1.5,
				}}
			>
				Select two imported reports to compare key metrics.
			</div>

			<label
				style={{
					fontSize: 12,
					color: C.textMuted,
					display: 'block',
					marginBottom: 6,
				}}
			>
				Older report
			</label>
			<select
				value={olderId}
				onChange={(event) => setOlderId(event.target.value)}
				style={selectStyle}
			>
				{reportOptions.map((option) => (
					<option key={option.id} value={option.id}>
						{option.label}
					</option>
				))}
			</select>

			<label
				style={{
					fontSize: 12,
					color: C.textMuted,
					display: 'block',
					marginBottom: 6,
				}}
			>
				Newer report
			</label>
			<select
				value={newerId}
				onChange={(event) => setNewerId(event.target.value)}
				style={selectStyle}
			>
				{reportOptions.map((option) => (
					<option key={option.id} value={option.id}>
						{option.label}
					</option>
				))}
			</select>

			{olderId && newerId && olderId !== newerId ? (
				<ReportComparisonView
					comparison={{
						id: `${olderId}-${newerId}`,
						olderReportId: olderId,
						newerReportId: newerId,
						label: 'Report Comparison',
						olderLabel:
							reportOptions.find((option) => option.id === olderId)?.label ??
							'Older report',
						newerLabel:
							reportOptions.find((option) => option.id === newerId)?.label ??
							'Newer report',
						metrics: [],
					}}
				/>
			) : (
				<div style={{ fontSize: 13, color: C.textMuted, marginTop: 12 }}>
					Select two different reports to compare.
				</div>
			)}
		</div>
	)
}
