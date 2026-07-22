import { Navigate, useParams } from 'react-router-dom'
import { C, pagePadding } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { HealthPageHeader } from '@/features/health/components/HealthPageHeader'
import { MetricsList } from '@/features/health/components/MetricsList'
import { useHealthReport } from '@/features/health/hooks/useHealthReport'
import { getCategoryById } from '@/features/health/services/health.service'

export function HealthReportDetailPage() {
	const { reportId } = useParams<{ reportId: string }>()
	const report = useHealthReport(reportId)

	if (!report) {
		return <Navigate to={ROUTES.health} replace />
	}

	const category = getCategoryById(report.category)

	return (
		<div style={{ padding: pagePadding.more, color: C.text }}>
			<HealthPageHeader title={report.title} backTo={ROUTES.health} />

			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					padding: '16px',
					marginBottom: 20,
				}}
			>
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'space-between',
						marginBottom: 12,
					}}
				>
					<span style={{ fontSize: 13, color: C.textMuted }}>
						{report.displayDate}
					</span>
					{category ? (
						<span
							style={{
								fontSize: 11,
								fontWeight: 700,
								color: category.color,
								background: `${category.color}18`,
								borderRadius: 100,
								padding: '4px 10px',
							}}
						>
							{category.name}
						</span>
					) : null}
				</div>
				<div
					style={{
						fontSize: 14,
						color: C.textMuted,
						marginBottom: 10,
					}}
				>
					{report.lab}
				</div>
				<div style={{ fontSize: 14, color: C.textSec, lineHeight: 1.55 }}>
					{report.summary}
				</div>
			</div>

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				Metrics
			</div>
			<MetricsList metrics={report.metrics} />
		</div>
	)
}
