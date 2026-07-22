import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { MetricsList } from '@/features/health/components/MetricsList'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { useHealthReport } from '@/features/health/hooks/useHealthReport'
import { getCategoryById } from '@/features/health/services/health.service'

export function HealthReportDetailPage() {
	const { reportId } = useParams<{ reportId: string }>()
	const navigate = useNavigate()
	const report = useHealthReport(reportId)

	if (!report) {
		return <Navigate to={ROUTES.healthReports} replace />
	}

	const category = getCategoryById(report.category)

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
				{report.title}
			</div>
			<div style={{ fontSize: 13, color: C.textMuted, marginBottom: 20 }}>
				{report.displayDate} · {report.lab}
				{category ? ` · ${category.name}` : ''}
			</div>

			<HealthSectionHeader title="Summary" />
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					padding: '16px',
					marginBottom: 24,
					fontSize: 14,
					color: C.textSec,
					lineHeight: 1.6,
				}}
			>
				{report.summary}
			</div>

			<HealthSectionHeader title="Key Metrics" />
			<div style={{ marginBottom: 24 }}>
				<MetricsList metrics={report.metrics} />
			</div>

			<HealthSectionHeader title="Doctor Notes" />
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					padding: '16px',
					marginBottom: 24,
					fontSize: 14,
					color: C.textSec,
					lineHeight: 1.6,
					fontStyle: 'italic',
				}}
			>
				{report.doctorNotes}
			</div>

			<HealthSectionHeader title="Recommendations" />
			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					overflow: 'hidden',
				}}
			>
				{report.recommendations.map((rec, index) => (
					<div
						key={rec}
						style={{
							padding: '14px 16px',
							borderBottom:
								index < report.recommendations.length - 1
									? `1px solid ${C.border}`
									: 'none',
							fontSize: 14,
							color: C.textSec,
							lineHeight: 1.5,
						}}
					>
						· {rec}
					</div>
				))}
			</div>
		</div>
	)
}
