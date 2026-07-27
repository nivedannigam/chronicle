import { C } from '@/constants/colors'
import { getStatusColor } from '@/features/health/services/health-companion.service'
import type { HealthStatusLabel } from '@/features/health/types/health-companion.types'
import { FigmaCircProgress } from '@/ui/figma/components/primitives'

interface HealthStatusHeroProps {
	status: HealthStatusLabel
	detail: string
	score: number | null
	memberName?: string | null
}

export function HealthStatusHero({
	status,
	detail,
	score,
	memberName,
}: HealthStatusHeroProps) {
	const color = getStatusColor(status)
	const label = memberName ? `How ${memberName} is doing` : 'How you are doing'

	return (
		<div
			style={{
				background: `linear-gradient(160deg, ${color}20 0%, ${C.card} 72%)`,
				border: `1px solid ${color}44`,
				borderRadius: 22,
				padding: '20px 18px',
				marginBottom: 20,
			}}
		>
			<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							letterSpacing: '0.09em',
							textTransform: 'uppercase',
							color: C.textMuted,
							marginBottom: 8,
						}}
					>
						{label}
					</div>
					<div
						style={{
							fontSize: 30,
							fontWeight: 800,
							letterSpacing: '-0.03em',
							color,
							lineHeight: 1.05,
							marginBottom: 8,
						}}
					>
						{status}
					</div>
					<div style={{ fontSize: 14, color: C.textSec, lineHeight: 1.55 }}>
						{detail}
					</div>
				</div>
				{score !== null ? (
					<FigmaCircProgress pct={Math.max(0, Math.min(100, score))} />
				) : null}
			</div>
		</div>
	)
}
