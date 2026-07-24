import { TrendingDown, TrendingUp, Minus, AlertCircle } from 'lucide-react'
import { C } from '@/constants/colors'
import type { HealthSnapshot, SnapshotTrend } from '@/features/health/types'

function trendLabel(trend: SnapshotTrend): string {
	switch (trend) {
		case 'improving':
			return 'Improving'
		case 'declining':
			return 'Declining'
		case 'attention':
			return 'Needs attention'
		default:
			return 'Stable'
	}
}

function TrendIcon({ trend }: { trend: SnapshotTrend }) {
	const size = 12
	switch (trend) {
		case 'improving':
			return <TrendingUp size={size} color={C.greenAlt} />
		case 'declining':
			return <TrendingDown size={size} color={C.orange} />
		case 'attention':
			return <AlertCircle size={size} color={C.red} />
		default:
			return <Minus size={size} color={C.textMuted} />
	}
}

interface HealthSnapshotCardProps {
	snapshot: HealthSnapshot
}

function HealthSnapshotCard({ snapshot }: HealthSnapshotCardProps) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 16,
				padding: '14px 12px',
				minHeight: 118,
			}}
		>
			<div style={{ fontSize: 22, marginBottom: 8 }}>{snapshot.emoji}</div>
			<div
				style={{
					fontSize: 13,
					fontWeight: 700,
					color: C.text,
					marginBottom: 6,
				}}
			>
				{snapshot.name}
			</div>
			<div
				style={{
					fontSize: 12,
					color: snapshot.color,
					fontWeight: 600,
					marginBottom: 8,
				}}
			>
				{snapshot.latestValue ?? snapshot.status}
			</div>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 4,
					fontSize: 11,
					color: C.textMuted,
					marginBottom: 4,
				}}
			>
				<TrendIcon trend={snapshot.trend} />
				{trendLabel(snapshot.trend)}
				{snapshot.historyCount != null && snapshot.historyCount > 0
					? ` · ${snapshot.historyCount} readings`
					: ''}
			</div>
			<div style={{ fontSize: 10, color: C.textMuted }}>
				Updated {snapshot.latestResultDate}
			</div>
		</div>
	)
}

interface HealthSnapshotGridProps {
	snapshots: HealthSnapshot[]
}

export function HealthSnapshotGrid({ snapshots }: HealthSnapshotGridProps) {
	return (
		<div
			style={{
				display: 'grid',
				gridTemplateColumns: '1fr 1fr',
				gap: 10,
				marginBottom: 26,
			}}
		>
			{snapshots.map((snapshot) => (
				<HealthSnapshotCard key={snapshot.id} snapshot={snapshot} />
			))}
		</div>
	)
}
