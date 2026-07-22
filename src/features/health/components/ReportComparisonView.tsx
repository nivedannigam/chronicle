import { C } from '@/constants/colors'
import type { MetricStatus, ReportComparison } from '@/features/health/types'

function statusColor(status: MetricStatus): string {
	switch (status) {
		case 'low':
		case 'high':
			return C.orange
		case 'critical':
			return C.red
		default:
			return C.greenAlt
	}
}

interface ReportComparisonViewProps {
	comparison: ReportComparison
}

export function ReportComparisonView({
	comparison,
}: ReportComparisonViewProps) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 18,
				overflow: 'hidden',
				marginBottom: 16,
			}}
		>
			<div
				style={{
					padding: '14px 16px',
					borderBottom: `1px solid ${C.border}`,
				}}
			>
				<div
					style={{
						fontSize: 15,
						fontWeight: 700,
						color: C.text,
						marginBottom: 4,
					}}
				>
					{comparison.label}
				</div>
				<div style={{ fontSize: 12, color: C.textMuted }}>
					{comparison.olderLabel} → {comparison.newerLabel}
				</div>
			</div>
			{comparison.metrics.map((row, index) => (
				<div
					key={row.metric}
					style={{
						padding: '12px 16px',
						borderBottom:
							index < comparison.metrics.length - 1
								? `1px solid ${C.border}`
								: 'none',
					}}
				>
					<div
						style={{
							fontSize: 14,
							fontWeight: 600,
							color: C.text,
							marginBottom: 8,
						}}
					>
						{row.metric}
					</div>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr 1fr',
							gap: 8,
							fontSize: 12,
						}}
					>
						<div>
							<div style={{ color: C.textMuted, marginBottom: 2 }}>Old</div>
							<div style={{ color: C.textSec, fontWeight: 600 }}>
								{row.oldValue}
							</div>
						</div>
						<div>
							<div style={{ color: C.textMuted, marginBottom: 2 }}>New</div>
							<div style={{ color: C.text, fontWeight: 600 }}>
								{row.newValue}
							</div>
						</div>
						<div>
							<div style={{ color: C.textMuted, marginBottom: 2 }}>Change</div>
							<div style={{ color: C.accentBlue, fontWeight: 700 }}>
								{row.difference}
							</div>
						</div>
					</div>
					<div style={{ marginTop: 8 }}>
						<span
							style={{
								fontSize: 10,
								fontWeight: 700,
								color: statusColor(row.status),
								background: `${statusColor(row.status)}18`,
								borderRadius: 100,
								padding: '3px 8px',
							}}
						>
							{row.status === 'normal'
								? 'Normal'
								: row.status === 'low'
									? 'Low'
									: row.status === 'high'
										? 'High'
										: 'Critical'}
						</span>
					</div>
				</div>
			))}
		</div>
	)
}
