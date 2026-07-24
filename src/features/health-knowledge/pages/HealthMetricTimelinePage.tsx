import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth'
import { C } from '@/constants/colors'
import {
	healthOcrPreviewPath,
	healthReportPath,
	ROUTES,
} from '@/constants/routes'
import { MetricMiniChart } from '@/features/health/components/dashboard/MetricMiniChart'
import { TrendArrow } from '@/features/health/components/dashboard/TrendArrow'
import { HealthSectionHeader } from '@/features/health/components/HealthSectionHeader'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { useHealthKnowledge } from '@/features/health-knowledge/hooks/useHealthKnowledge'
import { findRelationshipsForMetric } from '@/features/health-knowledge/engines/relationship.engine'

function formatDate(value: string): string {
	return new Date(value).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

export function HealthMetricTimelinePage() {
	const { metricId = '' } = useParams()
	const navigate = useNavigate()
	const { user } = useAuth()
	const uploadedQuery = useMemberHealthReports()
	const { getMetricHistory } = useHealthKnowledge(
		user?.id,
		uploadedQuery.data ?? [],
	)
	const history = getMetricHistory(metricId)
	const relationships = findRelationshipsForMetric(metricId)

	if (!history) {
		return (
			<div style={{ padding: 18, color: C.textSec }}>
				Metric not found in knowledge graph.
			</div>
		)
	}

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.healthMetrics)}
				style={{
					background: 'none',
					border: 'none',
					color: C.textSec,
					cursor: 'pointer',
					padding: 0,
					marginBottom: 16,
					fontFamily: 'inherit',
					fontSize: 13,
				}}
			>
				← Back to Trends
			</button>

			<HealthSectionHeader title={history.displayName} />
			<div
				style={{
					fontSize: 13,
					color: C.textSec,
					marginBottom: 20,
					lineHeight: 1.5,
				}}
			>
				{history.trend.description} · {history.observations.length} readings ·
				Latest {history.baseline.latestValueLabel}
			</div>

			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 18,
					padding: 16,
					marginBottom: 24,
				}}
			>
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom: 12,
					}}
				>
					<div style={{ fontSize: 28, fontWeight: 800, color: C.text }}>
						{history.baseline.latestValueLabel}
					</div>
					<TrendArrow
						direction={history.trend.direction}
						changePercent={history.trend.changePercent}
					/>
				</div>
				<MetricMiniChart
					observations={history.observations}
					color={C.accent}
					height={80}
				/>
			</div>

			<div style={{ marginBottom: 24 }}>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.09em',
						textTransform: 'uppercase',
						color: 'rgba(255,255,255,0.28)',
						marginBottom: 12,
					}}
				>
					History
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
					{[...history.observations].reverse().map((observation) => (
						<button
							key={observation.id}
							type="button"
							onClick={() => navigate(healthReportPath(observation.reportId))}
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								alignItems: 'center',
								gap: 12,
								background: C.card,
								border: `1px solid ${C.border}`,
								borderRadius: 14,
								padding: '12px 14px',
								cursor: 'pointer',
								textAlign: 'left',
								fontFamily: 'inherit',
							}}
						>
							<div>
								<div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>
									{observation.value}
								</div>
								<div style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
									{formatDate(observation.observedAt)} ·{' '}
									{observation.reportTitle}
								</div>
							</div>
							<div
								style={{ fontSize: 11, color: C.textSec, textAlign: 'right' }}
							>
								<div>{observation.status}</div>
								<div>{observation.laboratory}</div>
								<button
									type="button"
									onClick={(event) => {
										event.stopPropagation()
										navigate(healthOcrPreviewPath(observation.reportId))
									}}
									style={{
										marginTop: 4,
										background: 'none',
										border: 'none',
										padding: 0,
										color: C.accent,
										fontSize: 10,
										fontWeight: 700,
										cursor: 'pointer',
										fontFamily: 'inherit',
									}}
								>
									View OCR
								</button>
							</div>
						</button>
					))}
				</div>
			</div>

			{relationships.length > 0 && (
				<div>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							letterSpacing: '0.09em',
							textTransform: 'uppercase',
							color: 'rgba(255,255,255,0.28)',
							marginBottom: 12,
						}}
					>
						Related Metrics
					</div>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{relationships.map((relationship) => (
							<div
								key={relationship.id}
								style={{
									fontSize: 12,
									color: C.textSec,
									background: C.card,
									border: `1px solid ${C.border}`,
									borderRadius: 12,
									padding: '10px 12px',
								}}
							>
								{relationship.label}
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
