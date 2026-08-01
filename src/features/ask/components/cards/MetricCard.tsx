import { C } from '@/constants/colors'
import type {
	AskMetricStatus,
	MetricCardData,
} from '@/features/ask/types/ask.types'

function statusColor(status: AskMetricStatus): string {
	switch (status) {
		case 'low':
		case 'high':
			return C.orange
		case 'critical':
			return C.red
		case 'unknown':
			return C.textMuted
		default:
			return C.greenAlt
	}
}

function statusLabel(status: AskMetricStatus): string {
	if (status === 'normal') return 'Normal'
	if (status === 'unknown') return 'Reviewing'
	return status
}

function formatCardDate(value: string | undefined): string | undefined {
	if (!value?.trim()) {
		return undefined
	}

	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return value
	}

	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

interface MetricCardProps {
	data: MetricCardData
}

export function MetricCard({ data }: MetricCardProps) {
	const color = statusColor(data.status)

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 14,
				padding: '14px 16px',
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'flex-start',
					gap: 12,
					marginBottom: 6,
				}}
			>
				<div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
					{data.name}
				</div>
				<span
					style={{
						fontSize: 10,
						fontWeight: 700,
						color,
						background: `${color}18`,
						borderRadius: 100,
						padding: '3px 8px',
						flexShrink: 0,
					}}
				>
					{statusLabel(data.status)}
				</span>
			</div>
			<div
				style={{
					fontSize: 18,
					fontWeight: 700,
					color: C.text,
					marginBottom: 4,
				}}
			>
				{data.value}
			</div>
			{data.reference ? (
				<div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>
					Ref: {data.reference}
				</div>
			) : null}
			{data.reportTitle ? (
				<div style={{ fontSize: 11, color: C.textSec }}>
					{data.reportTitle}
					{formatCardDate(data.reportDate)
						? ` · ${formatCardDate(data.reportDate)}`
						: ''}
				</div>
			) : null}
		</div>
	)
}
