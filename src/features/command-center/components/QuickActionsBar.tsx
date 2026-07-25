import { useNavigate } from 'react-router-dom'
import { FileText, Heart, Sparkles, Timeline, UserPlus } from 'lucide-react'
import { C } from '@/constants/colors'
import { COMMAND_CENTER_COPY } from '@/constants/product-copy'
import type { QuickAction } from '@/features/command-center/types/command-center.types'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'

const ACTION_ICONS = {
	'import-documents': FileText,
	'import-health': Heart,
	ask: Sparkles,
	timeline: Timeline,
	'add-member': UserPlus,
} as const

interface QuickActionsBarProps {
	actions: QuickAction[]
}

export function QuickActionsBar({ actions }: QuickActionsBarProps) {
	const navigate = useNavigate()

	return (
		<section style={{ marginBottom: 24 }}>
			<HomeSectionLabel>
				{COMMAND_CENTER_COPY.quickActionsLabel}
			</HomeSectionLabel>
			<div
				style={{
					display: 'flex',
					gap: 8,
					overflowX: 'auto',
					paddingBottom: 4,
					scrollbarWidth: 'none',
				}}
			>
				{actions.map((action) => {
					const Icon =
						ACTION_ICONS[action.id as keyof typeof ACTION_ICONS] ?? Sparkles

					return (
						<button
							key={action.id}
							type="button"
							onClick={() => navigate(action.path)}
							style={{
								flexShrink: 0,
								width: 132,
								padding: '14px 12px',
								borderRadius: 16,
								border: `1px solid ${C.border}`,
								background: C.card,
								cursor: 'pointer',
								textAlign: 'left',
								fontFamily: 'inherit',
							}}
						>
							<div
								style={{
									width: 32,
									height: 32,
									borderRadius: 10,
									background: C.card2,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									marginBottom: 10,
								}}
							>
								<Icon size={16} color={C.textSec} />
							</div>
							<div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
								{action.label}
							</div>
							<div
								style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.4 }}
							>
								{action.description}
							</div>
						</button>
					)
				})}
			</div>
		</section>
	)
}
