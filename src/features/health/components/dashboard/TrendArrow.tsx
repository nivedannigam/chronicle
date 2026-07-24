import { ArrowDown, ArrowRight, ArrowUp, Minus } from 'lucide-react'
import { C } from '@/constants/colors'
import type { HealthTrendDirection } from '@/features/health-knowledge/types'

interface TrendArrowProps {
	direction: HealthTrendDirection
	changePercent?: number | null
	size?: number
}

export function TrendArrow({
	direction,
	changePercent,
	size = 16,
}: TrendArrowProps) {
	const config = getTrendConfig(direction)

	return (
		<span
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 4,
				color: config.color,
				fontSize: 11,
				fontWeight: 700,
			}}
		>
			<config.Icon size={size} />
			{changePercent != null && Number.isFinite(changePercent)
				? `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(1)}%`
				: config.label}
		</span>
	)
}

function getTrendConfig(direction: HealthTrendDirection) {
	switch (direction) {
		case 'improving':
			return { Icon: ArrowDown, color: C.greenAlt, label: 'Improving' }
		case 'declining':
		case 'rapid_change':
			return { Icon: ArrowUp, color: C.red, label: 'Increasing' }
		case 'stable':
			return { Icon: Minus, color: C.textMuted, label: 'Stable' }
		default:
			return { Icon: ArrowRight, color: C.textMuted, label: 'Unknown' }
	}
}
