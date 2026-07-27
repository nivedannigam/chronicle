import { CheckSquare, Home, Mail, Settings2, Sparkles } from 'lucide-react'
import { C } from '@/constants/colors'
import { useActiveTab } from '@/hooks/useActiveTab'
import { FigmaNavBadge } from '@/ui/figma/components/primitives'
import type { Tab } from '@/types/navigation'
import { emails } from '@/features/mail/constants/mock-data'
import { pendingTasks } from '@/features/tasks/constants/mock-data'

const NAV_ITEMS: {
	id: Tab
	Icon: typeof Home
	label: string
	badge?: string
}[] = [
	{ id: 'home', Icon: Home, label: 'Home' },
	{ id: 'ask', Icon: Sparkles, label: 'Ask' },
	{
		id: 'mail',
		Icon: Mail,
		label: 'Mail',
		badge:
			emails.filter((email) => email.unread).length > 9
				? '9+'
				: emails.filter((email) => email.unread).length > 0
					? String(emails.filter((email) => email.unread).length)
					: undefined,
	},
	{
		id: 'tasks',
		Icon: CheckSquare,
		label: 'Tasks',
		badge: pendingTasks.length > 0 ? String(pendingTasks.length) : undefined,
	},
	{ id: 'more', Icon: Settings2, label: 'More' },
]

export function FigmaBottomNav() {
	const { tab, setTab } = useActiveTab()

	return (
		<div
			style={{
				position: 'absolute',
				bottom: 0,
				left: 0,
				right: 0,
				background: 'rgba(12,12,18,0.92)',
				backdropFilter: 'blur(20px)',
				WebkitBackdropFilter: 'blur(20px)',
				borderTop: `1px solid ${C.border}`,
				padding: '10px 4px calc(24px + env(safe-area-inset-bottom))',
				display: 'flex',
				justifyContent: 'space-around',
				zIndex: 50,
			}}
		>
			{NAV_ITEMS.map(({ id, Icon, label, badge }) => {
				const active = tab === id

				return (
					<button
						key={id}
						type="button"
						onClick={() => setTab(id)}
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 3,
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							padding: '2px 10px',
							borderRadius: 12,
							position: 'relative',
							minWidth: 56,
							minHeight: 44,
							fontFamily: 'inherit',
						}}
					>
						{active ? (
							<div
								style={{
									position: 'absolute',
									inset: 0,
									background: C.accentDim,
									borderRadius: 12,
								}}
							/>
						) : null}
						<div style={{ position: 'relative' }}>
							<Icon
								size={22}
								color={active ? C.accent : C.textMuted}
								strokeWidth={active ? 2.2 : 1.6}
							/>
							{badge ? <FigmaNavBadge count={badge} /> : null}
						</div>
						<span
							style={{
								fontSize: 10,
								fontWeight: active ? 700 : 400,
								color: active ? C.accent : C.textMuted,
								letterSpacing: '-0.01em',
							}}
						>
							{label}
						</span>
					</button>
				)
			})}
		</div>
	)
}
