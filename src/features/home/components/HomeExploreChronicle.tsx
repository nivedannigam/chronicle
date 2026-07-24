import { useNavigate } from 'react-router-dom'
import { C } from '@/constants/colors'
import { HOME_COPY } from '@/constants/product-copy'
import { getExploreCapabilities, MODULE_ROUTES } from '@/constants/modules'
import { ROUTES } from '@/constants/routes'
import { HomeSectionLabel } from '@/features/home/components/HomeSectionLabel'

export function HomeExploreChronicle() {
	const navigate = useNavigate()
	const capabilities = getExploreCapabilities()

	return (
		<section style={{ marginBottom: 28 }}>
			<HomeSectionLabel>{HOME_COPY.exploreLabel}</HomeSectionLabel>
			<div
				style={{
					display: 'flex',
					gap: 10,
					overflowX: 'auto',
					scrollbarWidth: 'none',
					paddingBottom: 4,
					margin: '0 -4px',
					padding: '0 4px 4px',
				}}
			>
				{capabilities.map((module) => {
					const isActive = module.enabled && !module.comingSoon
					const route = MODULE_ROUTES[module.id] ?? ROUTES.more

					return (
						<button
							key={module.id}
							type="button"
							onClick={() => {
								if (isActive) {
									navigate(route)
								}
							}}
							style={{
								flexShrink: 0,
								width: 132,
								padding: '16px 14px',
								borderRadius: 18,
								border: isActive
									? `1px solid ${module.color ?? C.teal}44`
									: `1px solid ${C.border}`,
								background: isActive
									? `linear-gradient(160deg, ${module.color ?? C.teal}20 0%, ${C.card} 100%)`
									: `linear-gradient(160deg, ${module.color ?? C.accent}12 0%, ${C.card} 100%)`,
								cursor: isActive ? 'pointer' : 'default',
								fontFamily: 'inherit',
								textAlign: 'left',
								position: 'relative',
								overflow: 'hidden',
							}}
						>
							<div
								style={{
									position: 'absolute',
									top: -16,
									right: -16,
									width: 64,
									height: 64,
									borderRadius: '50%',
									background: `${module.color ?? C.accent}18`,
									filter: 'blur(20px)',
									pointerEvents: 'none',
								}}
							/>
							<div
								style={{
									width: 40,
									height: 40,
									borderRadius: 12,
									background: `${module.color ?? C.accent}20`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									marginBottom: 12,
								}}
							>
								<module.icon
									size={20}
									color={module.color ?? C.textSec}
									strokeWidth={1.8}
								/>
							</div>
							<div
								style={{
									fontSize: 14,
									fontWeight: 700,
									marginBottom: 4,
									letterSpacing: '-0.01em',
								}}
							>
								{module.name}
							</div>
							{module.comingSoon ? (
								<div
									style={{
										fontSize: 10,
										fontWeight: 600,
										letterSpacing: '0.06em',
										textTransform: 'uppercase',
										color: module.color ?? C.textMuted,
									}}
								>
									Coming Soon
								</div>
							) : (
								<div
									style={{
										fontSize: 11,
										fontWeight: 600,
										color: module.color ?? C.teal,
									}}
								>
									Open
								</div>
							)}
						</button>
					)
				})}
			</div>
		</section>
	)
}
