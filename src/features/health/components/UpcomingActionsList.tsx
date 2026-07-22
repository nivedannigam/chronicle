import { Calendar } from 'lucide-react'
import { C } from '@/constants/colors'
import type { UpcomingAction } from '@/features/health/types'

interface UpcomingActionsListProps {
	actions: UpcomingAction[]
}

export function UpcomingActionsList({ actions }: UpcomingActionsListProps) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
			{actions.map((action) => (
				<div
					key={action.id}
					style={{
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 16,
						padding: '14px 16px',
						display: 'flex',
						alignItems: 'center',
						gap: 12,
					}}
				>
					<div
						style={{
							width: 36,
							height: 36,
							borderRadius: 11,
							background: C.accentDim,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							flexShrink: 0,
						}}
					>
						<Calendar size={18} color={C.accent} strokeWidth={1.6} />
					</div>
					<div style={{ flex: 1 }}>
						<div
							style={{
								fontSize: 14,
								fontWeight: 600,
								color: C.text,
								marginBottom: 3,
							}}
						>
							{action.title}
						</div>
						<div style={{ fontSize: 12, color: C.textMuted }}>
							{action.dueLabel}
						</div>
					</div>
				</div>
			))}
		</div>
	)
}
