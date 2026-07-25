import { C } from '@/constants/colors'
import { getStatusColor } from '@/features/health/services/health-companion.service'
import type { HealthStatusLabel } from '@/features/health/types/health-companion.types'

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

	return (
		<div
			style={{
				background: `linear-gradient(160deg, ${color}20 0%, ${C.card} 72%)`,
				border: `1px solid ${color}44`,
				borderRadius: 22,
				padding: '22px 20px',
				marginBottom: 20,
			}}
		>
			<div
				style={{
					fontSize: 11,
					fontWeight: 700,
					letterSpacing: '0.08em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 8,
				}}
			>
				{memberName ? `How ${memberName} is doing` : 'How you are doing'}
			</div>
			<div
				style={{
					fontSize: 32,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					color,
					lineHeight: 1.05,
					marginBottom: 8,
				}}
			>
				{status}
			</div>
			<div style={{ fontSize: 14, color: C.textSec, lineHeight: 1.5 }}>
				{detail}
			</div>
			{score !== null ? (
				<div
					style={{
						marginTop: 14,
						display: 'inline-flex',
						alignItems: 'center',
						gap: 8,
						background: `${color}14`,
						borderRadius: 100,
						padding: '6px 12px',
						fontSize: 12,
						fontWeight: 700,
						color,
					}}
				>
					Health score {score}
				</div>
			) : null}
		</div>
	)
}
