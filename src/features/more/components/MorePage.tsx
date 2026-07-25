import { useNavigate } from 'react-router-dom'
import { C, pagePadding } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import {
	getModuleById,
	getMoreComingSoonModules,
	MODULE_ROUTES,
} from '@/constants/modules'

export function MorePage() {
	const navigate = useNavigate()
	const documentsModule = getModuleById('documents')
	const comingSoonModules = getMoreComingSoonModules()

	const navigableModules = documentsModule ? [documentsModule] : []

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
					Organize health records and documents for your family.
				</div>
			</div>

			{navigableModules.length > 0 ? (
				<>
					<div
						style={{
							fontSize: 11,
							fontWeight: 600,
							letterSpacing: '0.08em',
							textTransform: 'uppercase',
							color: C.textMuted,
							marginTop: 24,
							marginBottom: 10,
						}}
					>
						Available
					</div>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
							gap: 12,
							marginBottom: 24,
						}}
					>
						{navigableModules.map((module) => (
							<ModuleCard
								key={module.id}
								module={module}
								isActive
								onClick={() =>
									navigate(MODULE_ROUTES[module.id] ?? ROUTES.documents)
								}
							/>
						))}
					</div>
				</>
			) : null}

			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.08em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 10,
				}}
			>
				Coming Soon
			</div>
			<div
				style={{
					display: 'grid',
					gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
					gap: 12,
				}}
			>
				{comingSoonModules.map((module) => (
					<ModuleCard key={module.id} module={module} isActive={false} />
				))}
			</div>
		</div>
	)
}

function ModuleCard({
	module,
	isActive,
	onClick,
}: {
	module: {
		id: string
		name: string
		icon: React.ComponentType<{
			size?: number
			color?: string
			strokeWidth?: number
		}>
		color?: string
	}
	isActive: boolean
	onClick?: () => void
}) {
	const Wrapper = isActive ? 'button' : 'div'

	return (
		<Wrapper
			type={isActive ? 'button' : undefined}
			onClick={onClick}
			style={{
				background: `linear-gradient(160deg, ${module.color ?? C.accent}14 0%, ${C.card} 100%)`,
				border: `1px solid ${isActive ? `${module.color ?? C.accent}44` : C.border}`,
				borderRadius: 20,
				padding: '18px 16px',
				minHeight: 132,
				display: 'flex',
				flexDirection: 'column',
				gap: 14,
				position: 'relative',
				overflow: 'hidden',
				cursor: isActive ? 'pointer' : 'default',
				fontFamily: 'inherit',
				textAlign: 'left',
				width: '100%',
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
						color: isActive
							? (module.color ?? C.teal)
							: (module.color ?? C.textMuted),
					}}
				>
					{isActive ? 'Open' : 'Coming Soon'}
				</div>
			</div>
		</Wrapper>
	)
}
