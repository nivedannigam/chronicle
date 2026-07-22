import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { ReportComparisonView } from '@/features/health/components/ReportComparisonView'
import {
	getHealthReports,
	getReportComparisons,
} from '@/features/health/services/health.service'

export function HealthComparePage() {
	const navigate = useNavigate()
	const reports = getHealthReports()
	const presetComparisons = getReportComparisons()
	const [olderId, setOlderId] = useState(
		presetComparisons[0]?.olderReportId ?? '',
	)
	const [newerId, setNewerId] = useState(
		presetComparisons[0]?.newerReportId ?? '',
	)

	const preset = presetComparisons.find(
		(c) => c.olderReportId === olderId && c.newerReportId === newerId,
	)

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

			<div
				style={{
					fontSize: 28,
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
					marginBottom: 22,
					lineHeight: 1.5,
				}}
			>
				See how your metrics changed between two reports.
			</div>

			<div style={{ marginBottom: 20 }}>
				<div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
					Older report
				</div>
				<select
					value={olderId}
					onChange={(e) => setOlderId(e.target.value)}
					style={selectStyle}
				>
					{reports.map((report) => (
						<option key={report.id} value={report.id}>
							{report.displayDate} — {report.title}
						</option>
					))}
				</select>
				<div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
					Newer report
				</div>
				<select
					value={newerId}
					onChange={(e) => setNewerId(e.target.value)}
					style={selectStyle}
				>
					{reports.map((report) => (
						<option key={report.id} value={report.id}>
							{report.displayDate} — {report.title}
						</option>
					))}
				</select>
			</div>

			{preset ? (
				<ReportComparisonView comparison={preset} />
			) : (
				<div
					style={{
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 16,
						padding: '16px',
						fontSize: 13,
						color: C.textMuted,
						lineHeight: 1.5,
					}}
				>
					No mock comparison available for this pair. Select Liver or Vitamin
					preset pairs from the dropdowns.
				</div>
			)}
		</div>
	)
}
