import { Calendar } from 'lucide-react'
import { C } from '@/constants/colors'

interface LastCheckupCardProps {
	label: string
}

export function LastCheckupCard({ label }: LastCheckupCardProps) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 18,
				padding: '16px',
				marginBottom: 26,
				display: 'flex',
				alignItems: 'center',
				gap: 14,
			}}
		>
			<div
				style={{
					width: 42,
					height: 42,
					borderRadius: 14,
					background: `${C.teal}18`,
					border: `1px solid ${C.teal}25`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				<Calendar size={20} color={C.teal} strokeWidth={1.7} />
			</div>
			<div style={{ flex: 1 }}>
				<div
					style={{
						fontSize: 11,
						fontWeight: 600,
						letterSpacing: '0.09em',
						textTransform: 'uppercase',
						color: C.textMuted,
						marginBottom: 4,
					}}
				>
					Last Checkup
				</div>
				<div
					style={{
						fontSize: 16,
						fontWeight: 700,
						color: C.text,
						letterSpacing: '-0.01em',
					}}
				>
					{label}
				</div>
			</div>
		</div>
	)
}
