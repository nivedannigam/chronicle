import { NAV_BAR_STYLE, NAVIGATION_ITEMS } from '@/constants/navigation'
import { getModuleById } from '@/constants/modules'
import { C } from '@/constants/colors'
import { useActiveTab } from '@/hooks/useActiveTab'

export function BottomNavigation() {
	const { tab, setTab } = useActiveTab()

	return (
		<div
			style={{
				...NAV_BAR_STYLE,
				borderTop: `1px solid ${C.border}`,
			}}
		>
			{NAVIGATION_ITEMS.map(({ moduleId, label, badge }) => {
				const active = tab === moduleId
				const module = getModuleById(moduleId)
				const Icon = module?.icon

				if (!Icon) {
					return null
				}

				return (
					<button
						key={moduleId}
						type="button"
						onClick={() => setTab(moduleId)}
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 4,
							background: 'none',
							border: 'none',
							cursor: 'pointer',
							padding: '6px 12px',
							borderRadius: 12,
							position: 'relative',
							minWidth: 68,
							minHeight: 44,
						}}
					>
						{active && (
							<div
								style={{
									position: 'absolute',
									inset: 0,
									background: C.accentDim,
									borderRadius: 12,
								}}
							/>
						)}
						<div style={{ position: 'relative' }}>
							<Icon
								size={27}
								color={active ? C.accent : C.textMuted}
								strokeWidth={active ? 2.2 : 1.6}
							/>
							{badge ? (
								<div
									style={{
										position: 'absolute',
										top: -2,
										right: -2,
										background: C.accentBlue,
										borderRadius: 100,
										minWidth: 16,
										height: 16,
										padding: '0 4px',
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'center',
										fontSize: 9,
										fontWeight: 700,
										color: C.white,
										letterSpacing: '-0.02em',
										border: `1.5px solid ${C.bg}`,
									}}
								>
									{badge}
								</div>
							) : null}
						</div>
						<span
							style={{
								fontSize: 11,
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
