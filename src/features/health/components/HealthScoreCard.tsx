import { C } from '@/constants/colors'

interface HealthScoreCardProps {
	score: number
}

export function HealthScoreCard({ score }: HealthScoreCardProps) {
	const r = 36
	const cx = 44
	const cy = 44
	const circ = 2 * Math.PI * r
	const offset = circ - (score / 100) * circ

	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 18,
				padding: '18px 16px',
				marginBottom: 12,
			}}
		>
			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 14,
				}}
			>
				Health Score
			</div>
			<div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
				<svg
					width={88}
					height={88}
					viewBox="0 0 88 88"
					style={{ flexShrink: 0 }}
				>
					<circle
						cx={cx}
						cy={cy}
						r={r}
						fill="none"
						stroke="rgba(255,255,255,0.08)"
						strokeWidth={6}
					/>
					<circle
						cx={cx}
						cy={cy}
						r={r}
						fill="none"
						stroke={C.greenAlt}
						strokeWidth={6}
						strokeDasharray={circ}
						strokeDashoffset={offset}
						strokeLinecap="round"
						transform={`rotate(-90 ${cx} ${cy})`}
					/>
					<text
						x={cx}
						y={cy + 2}
						textAnchor="middle"
						dominantBaseline="middle"
						fill="white"
						fontSize="20"
						fontWeight="700"
						fontFamily="system-ui"
					>
						{score}
					</text>
				</svg>
				<div style={{ flex: 1 }}>
					<div
						style={{
							fontSize: 17,
							fontWeight: 700,
							color: C.text,
							marginBottom: 6,
							letterSpacing: '-0.01em',
						}}
					>
						Looking good
					</div>
					<div style={{ fontSize: 13, color: C.textSec, lineHeight: 1.5 }}>
						Based on your latest reports and checkup results.
					</div>
				</div>
			</div>
		</div>
	)
}
