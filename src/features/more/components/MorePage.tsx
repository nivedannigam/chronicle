import { C, pagePadding } from '@/constants/colors'
import { getExploreCapabilities } from '@/constants/modules'

export function MorePage() {
	const modules = getExploreCapabilities().filter(
		(module) => module.id !== 'health',
	)

	return (
		<div style={{ padding: pagePadding.more, color: C.text }}>
			<div style={{ marginBottom: 8 }}>
				<div
					style={{
						fontSize: 34,
						fontWeight: 800,
						letterSpacing: '-0.04em',
						lineHeight: 1.05,
						marginBottom: 8,
					}}
				>
					More
				</div>
				<div
					style={{
						fontSize: 14,
						color: C.textMuted,
						lineHeight: 1.5,
						maxWidth: 300,
					}}
				>
					Upcoming capabilities for your family&apos;s personal operating
					system.
				</div>
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
					gap: 12,
					marginTop: 24,
				}}
			>
				{modules.map((module) => (
					<div
						key={module.id}
						style={{
							background: `linear-gradient(160deg, ${module.color ?? C.accent}14 0%, ${C.card} 100%)`,
							border: `1px solid ${C.border}`,
							borderRadius: 20,
							padding: '18px 16px',
							minHeight: 132,
							display: 'flex',
							flexDirection: 'column',
							gap: 14,
							position: 'relative',
							overflow: 'hidden',
						}}
					>
						<div
							style={{
								position: 'absolute',
								top: -20,
								right: -20,
								width: 80,
								height: 80,
								borderRadius: '50%',
								background: `${module.color ?? C.accent}16`,
								filter: 'blur(24px)',
								pointerEvents: 'none',
							}}
						/>
						<div
							style={{
								width: 44,
								height: 44,
								borderRadius: 14,
								background: `${module.color ?? C.textMuted}18`,
								border: `1px solid ${module.color ?? C.textMuted}28`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<module.icon
								size={22}
								color={module.color ?? C.textSec}
								strokeWidth={1.7}
							/>
						</div>
						<div style={{ flex: 1 }}>
							<div
								style={{
									fontSize: 15,
									fontWeight: 700,
									marginBottom: 4,
									letterSpacing: '-0.01em',
								}}
							>
								{module.name}
							</div>
							<div
								style={{
									fontSize: 11,
									fontWeight: 600,
									letterSpacing: '0.06em',
									textTransform: 'uppercase',
									color: module.color ?? C.textMuted,
								}}
							>
								Coming Soon
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
