import { C } from '@/constants/colors'

interface TaskProgressRingProps {
	pct: number
}

export function TaskProgressRing({ pct }: TaskProgressRingProps) {
	const r = 26
	const cx = 32
	const cy = 32
	const circ = 2 * Math.PI * r
	const offset = circ - (pct / 100) * circ

	return (
		<svg width={64} height={64} viewBox="0 0 64 64" style={{ flexShrink: 0 }}>
			<circle
				cx={cx}
				cy={cy}
				r={r}
				fill="none"
				stroke="rgba(255,255,255,0.08)"
				strokeWidth={5}
			/>
			<circle
				cx={cx}
				cy={cy}
				r={r}
				fill="none"
				stroke={C.accent}
				strokeWidth={5}
				strokeDasharray={circ}
				strokeDashoffset={offset}
				strokeLinecap="round"
				transform={`rotate(-90 ${cx} ${cy})`}
			/>
			<text
				x={cx}
				y={cy + 1}
				textAnchor="middle"
				dominantBaseline="middle"
				fill="white"
				fontSize="11"
				fontWeight="700"
				fontFamily="system-ui"
			>
				{pct}%
			</text>
		</svg>
	)
}
