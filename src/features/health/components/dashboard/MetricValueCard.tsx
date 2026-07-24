import { useNavigate } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { C } from '@/constants/colors'
import { healthReportPath } from '@/constants/routes'
import { MetricMiniChart } from '@/features/health/components/dashboard/MetricMiniChart'
import { TrendArrow } from '@/features/health/components/dashboard/TrendArrow'
import type { HealthMetricHistory } from '@/features/health-knowledge/types'

interface MetricValueCardProps {
	history: HealthMetricHistory
	onViewTimeline?: (metricId: string) => void
}

export function MetricValueCard({
	history,
	onViewTimeline,
}: MetricValueCardProps) {
	const navigate = useNavigate()
	const latest = history.observations[history.observations.length - 1]
	const previous =
		history.observations.length > 1
			? history.observations[history.observations.length - 2]
			: null

	if (!latest) {
		return null
	}

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 16,
				padding: '14px 14px 12px',
				width: '100%',
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-start',
					gap: 8,
					marginBottom: 8,
				}}
			>
				<div style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>
					{history.displayName}
				</div>
				<TrendArrow
					direction={history.trend.direction}
					changePercent={history.trend.changePercent}
				/>
			</div>

			<div
				style={{
					fontSize: 28,
					fontWeight: 800,
					color: C.text,
					letterSpacing: '-0.02em',
					marginBottom: 4,
				}}
			>
				{latest.value}
				{history.unit && !latest.value.includes(history.unit) ? (
					<span
						style={{
							fontSize: 13,
							fontWeight: 600,
							color: C.textMuted,
							marginLeft: 4,
						}}
					>
						{history.unit}
					</span>
				) : null}
			</div>

			<div
				style={{
					display: 'flex',
					gap: 12,
					fontSize: 11,
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				{previous ? <span>Previous: {previous.value}</span> : null}
				{latest.referenceRange ? (
					<span>Normal: {latest.referenceRange}</span>
				) : null}
			</div>

			<div style={{ marginBottom: 10 }}>
				<MetricMiniChart observations={history.observations} />
			</div>

			<div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
				{new Date(latest.observedAt).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
				})}
			</div>

			<div style={{ display: 'flex', gap: 8 }}>
				<button
					type="button"
					onClick={() => navigate(healthReportPath(latest.reportId))}
					style={chipButtonStyle}
				>
					<FileText size={12} />
					View report
				</button>
				{onViewTimeline ? (
					<button
						type="button"
						onClick={() => onViewTimeline(history.canonicalMetricId)}
						style={chipButtonStyle}
					>
						Timeline
					</button>
				) : null}
			</div>
		</div>
	)
}

const chipButtonStyle = {
	display: 'inline-flex',
	alignItems: 'center',
	gap: 4,
	background: C.accentDim,
	border: '1px solid rgba(108,111,255,0.2)',
	borderRadius: 100,
	padding: '6px 12px',
	fontSize: 12,
	fontWeight: 700,
	color: C.accent,
	cursor: 'pointer',
	fontFamily: 'inherit',
} as const
