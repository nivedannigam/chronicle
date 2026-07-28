import { FileText, Heart, Home, Sparkles, User } from 'lucide-react'
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
	{ id: 'health', Icon: Heart, label: 'Health' },
	{ id: 'ask', Icon: Sparkles, label: 'Ask', center: true },
	{ id: 'more', Icon: FileText, label: 'More' },
	{ id: 'profile', Icon: User, label: 'Profile' },
]

export function FigmaBottomNav({
	browserChromeInset = '0px',
}: {
	browserChromeInset?: string
}) {
	const { tab, setTab } = useActiveTab()

	return (
		<div
			style={{
				position: 'absolute',
				bottom: `calc(22px + ${browserChromeInset})`,
				left: 14,
				right: 14,
				background: 'rgba(10,10,14,0.94)',
				backdropFilter: 'blur(32px)',
				WebkitBackdropFilter: 'blur(32px)',
				border: '1px solid rgba(255,255,255,0.08)',
				borderRadius: 36,
				padding: '8px 4px calc(8px + env(safe-area-inset-bottom))',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-around',
				boxShadow:
					'0 16px 56px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.05)',
				zIndex: 50,
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
							style={{
								width: 54,
								height: 54,
								borderRadius: 20,
								cursor: 'pointer',
								background: active
									? `linear-gradient(145deg,${FC.blue},${FC.indigo})`
									: `linear-gradient(145deg,rgba(59,130,246,0.2),rgba(99,102,241,0.12))`,
								border: `1px solid ${active ? 'rgba(99,102,241,0.55)' : 'rgba(59,130,246,0.22)'}`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
								transform: 'translateY(-6px)',
								boxShadow: active
									? '0 8px 24px rgba(59,130,246,0.45)'
									: '0 4px 14px rgba(0,0,0,0.4)',
							}}
						>
							<Icon
								size={22}
								color={active ? '#fff' : FC.blue}
								strokeWidth={active ? 2 : 1.8}
							/>
						</button>
					)
				}

				return (
					<button
						key={id}
						type="button"
						onClick={() => setTab(id)}
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 4,
							padding: '4px 14px',
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							position: 'relative',
						}}
					>
						{active ? (
							<div
								style={{
									position: 'absolute',
									top: 0,
									left: '50%',
									transform: 'translateX(-50%)',
									width: 36,
									height: 28,
									borderRadius: 10,
									background: `${FC.blue}18`,
									boxShadow: `0 0 12px ${FC.blue}30`,
								}}
							/>
						) : null}
						<Icon
							size={21}
							color={active ? FC.blue : 'rgba(255,255,255,0.28)'}
							strokeWidth={active ? 2.2 : 1.7}
						/>
						<span
							style={{
								color: active ? FC.blue : 'rgba(255,255,255,0.28)',
								fontSize: 10,
								fontWeight: active ? 600 : 400,
								letterSpacing: 0.1,
							}}
						>
							{label}
						</span>
						<div
							style={{
								width: 3,
								height: 3,
								borderRadius: 1.5,
								background: active ? FC.blue : 'transparent',
								marginTop: 0,
							}}
						/>
					</button>
				)
			})}
		</div>
	)
}
