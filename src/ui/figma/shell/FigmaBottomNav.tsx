import { BookOpen, Home, LayoutGrid, Sparkles, User } from 'lucide-react'
import { useActiveTab } from '@/hooks/useActiveTab'
import { FC } from '@/ui/figma/tokens/figma-v2-tokens'
import type { Tab } from '@/types/navigation'

const NAV_ITEMS: {
	id: Tab
	Icon: typeof Home
	label: string
	center?: boolean
}[] = [
	{ id: 'home', Icon: Home, label: 'Home' },
	{ id: 'modules', Icon: LayoutGrid, label: 'Modules' },
	{ id: 'ask', Icon: Sparkles, label: 'Ask', center: true },
	{ id: 'library', Icon: BookOpen, label: 'Library' },
	{ id: 'profile', Icon: User, label: 'You' },
]

const TAB_TRANSITION = 'all 0.28s cubic-bezier(0.34, 1.2, 0.64, 1)'

export function FigmaBottomNav() {
	const { tab, setTab } = useActiveTab()

	return (
		<nav
			aria-label="Primary navigation"
			style={{
				width: '100%',
				pointerEvents: 'auto',
			}}
		>
			<div
				style={{
					background: 'rgba(18,18,22,0.82)',
					backdropFilter: 'blur(40px) saturate(180%)',
					WebkitBackdropFilter: 'blur(40px) saturate(180%)',
					border: '1px solid rgba(255,255,255,0.12)',
					borderRadius: 28,
					padding: '10px 8px',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-around',
					boxShadow:
						'0 16px 48px rgba(0,0,0,0.62), 0 4px 12px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.08)',
				}}
			>
				{NAV_ITEMS.map(({ id, Icon, label, center }) => {
					const active = tab === id

					if (center) {
						return (
							<button
								key={id}
								type="button"
								onClick={() => setTab(id)}
								aria-label={label}
								aria-current={active ? 'page' : undefined}
								style={{
									width: 52,
									height: 52,
									borderRadius: 18,
									cursor: 'pointer',
									background: active
										? `linear-gradient(145deg,${FC.blue},${FC.indigo})`
										: `linear-gradient(145deg,rgba(59,130,246,0.18),rgba(99,102,241,0.1))`,
									border: `1px solid ${active ? 'rgba(99,102,241,0.55)' : 'rgba(59,130,246,0.2)'}`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									transform: active
										? 'translateY(-8px) scale(1.04)'
										: 'translateY(-4px) scale(1)',
									boxShadow: active
										? '0 10px 28px rgba(59,130,246,0.42)'
										: '0 4px 14px rgba(0,0,0,0.35)',
									transition: TAB_TRANSITION,
									fontFamily: 'inherit',
								}}
							>
								<Icon
									size={22}
									color={active ? '#fff' : FC.blue}
									strokeWidth={active ? 2.2 : 1.8}
									style={{ transition: TAB_TRANSITION }}
								/>
							</button>
						)
					}

					return (
						<button
							key={id}
							type="button"
							onClick={() => setTab(id)}
							aria-label={label}
							aria-current={active ? 'page' : undefined}
							style={{
								display: 'flex',
								flexDirection: 'column',
								alignItems: 'center',
								gap: 4,
								padding: '6px 10px',
								background: 'none',
								border: 'none',
								cursor: 'pointer',
								position: 'relative',
								minWidth: 52,
								minHeight: 52,
								fontFamily: 'inherit',
								transition: TAB_TRANSITION,
								transform: active ? 'scale(1.02)' : 'scale(1)',
							}}
						>
							{active ? (
								<div
									style={{
										position: 'absolute',
										top: 2,
										left: '50%',
										transform: 'translateX(-50%)',
										width: 40,
										height: 30,
										borderRadius: 12,
										background: `${FC.blue}16`,
										boxShadow: `0 0 16px ${FC.blue}28`,
										transition: TAB_TRANSITION,
									}}
								/>
							) : null}
							<Icon
								size={21}
								color={active ? FC.blue : 'rgba(255,255,255,0.28)'}
								strokeWidth={active ? 2.2 : 1.7}
								style={{
									position: 'relative',
									transition: TAB_TRANSITION,
								}}
							/>
							<span
								style={{
									color: active ? FC.blue : 'rgba(255,255,255,0.28)',
									fontSize: 10,
									fontWeight: active ? 600 : 400,
									position: 'relative',
									transition: TAB_TRANSITION,
								}}
							>
								{label}
							</span>
						</button>
					)
				})}
			</div>
		</nav>
	)
}
