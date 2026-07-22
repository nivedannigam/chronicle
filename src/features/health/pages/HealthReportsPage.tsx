import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { healthReportPath, ROUTES } from '@/constants/routes'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { ReportComparisonView } from '@/features/health/components/ReportComparisonView'
import {
	getHealthReports,
	getReportComparisons,
	getCategoryById,
} from '@/features/health/services/health.service'

export function HealthReportsPage() {
	const navigate = useNavigate()
	const reports = getHealthReports()
	const comparisons = getReportComparisons()

	return (
		<>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 22,
					lineHeight: 1.5,
				}}
			>
				All health reports and lab results in one place.
			</div>

			<HealthSectionHeader title="All Reports" />
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					gap: 8,
					marginBottom: 28,
				}}
			>
				{reports.map((report) => {
					const category = getCategoryById(report.category)

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
									{report.displayDate} · {report.lab}
								</div>
								<div
									style={{
										fontSize: 15,
										fontWeight: 600,
										color: C.text,
										marginBottom: 6,
									}}
								>
									{report.title}
								</div>
								{category ? (
									<span
										style={{
											fontSize: 11,
											fontWeight: 700,
											color: category.color,
											background: `${category.color}18`,
											borderRadius: 100,
											padding: '3px 9px',
										}}
									>
										{category.name}
									</span>
								) : null}
							</div>
							<ChevronRight size={18} color={C.textMuted} />
						</div>
					)
				})}
			</div>

			<HealthSectionHeader title="Compare Reports" />
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
				{comparisons.map((comparison) => (
					<ReportComparisonView key={comparison.id} comparison={comparison} />
				))}
			</div>
		</>
	)
}
