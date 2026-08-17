import { ChevronRight } from 'lucide-react'
import type { ModuleDefinition } from '@/types/modules'
import { FC } from '@/ui/figma/v2/atoms'

export function ModuleLauncherCard({
	module,
	documentCount,
	onClick,
}: {
	module: ModuleDefinition
	documentCount?: number
	onClick: () => void
}) {
	const color = module.color ?? FC.blue
	const Icon = module.icon

	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				width: '100%',
				background: `linear-gradient(145deg, ${color}29, ${color}0f)`,
				border: `1px solid ${color}38`,
				borderRadius: 22,
				padding: '18px 20px',
				display: 'flex',
				alignItems: 'center',
				gap: 16,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<div
				style={{
					width: 48,
					height: 48,
					borderRadius: 16,
					background: `${color}18`,
					border: `1px solid ${color}28`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				<Icon size={24} color={color} strokeWidth={1.5} />
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<p
					style={{
						color: FC.fg,
						fontSize: 16,
						fontWeight: 700,
						margin: '0 0 4px',
					}}
				>
					{module.name}
				</p>
				<p style={{ color: FC.dim, fontSize: 12, margin: 0, lineHeight: 1.45 }}>
					{module.description}
					{documentCount != null && documentCount > 0
						? ` · ${documentCount} document${documentCount === 1 ? '' : 's'}`
						: ''}
				</p>
			</div>
			<ChevronRight size={18} color={FC.mid} />
		</button>
	)
}

export function ModuleComingSoonCard({ module }: { module: ModuleDefinition }) {
	const color = module.color ?? FC.mid
	const Icon = module.icon

	return (
		<div
			style={{
				background: `linear-gradient(145deg, ${color}14, ${color}08)`,
				border: `1px solid ${color}22`,
				borderRadius: 24,
				padding: '20px 16px 16px',
				opacity: 0.72,
			}}
		>
			<div style={{ marginBottom: 14 }}>
				<Icon size={28} color={color} strokeWidth={1.5} />
			</div>
			<p
				style={{
					color: FC.fg,
					fontSize: 15,
					fontWeight: 700,
					letterSpacing: -0.3,
					marginBottom: 5,
					marginTop: 0,
				}}
			>
				{module.name}
			</p>
			<div
				style={{
					display: 'inline-flex',
					alignItems: 'center',
					gap: 5,
					background: 'rgba(0,0,0,0.2)',
					borderRadius: 8,
					padding: '3px 8px',
				}}
			>
				<div
					style={{
						width: 5,
						height: 5,
						borderRadius: 3,
						background: color,
					}}
				/>
				<span
					style={{
						color,
						fontSize: 10,
						fontWeight: 600,
						letterSpacing: '0.06em',
					}}
				>
					COMING SOON
				</span>
			</div>
		</div>
	)
}

export function HomeModuleCard({
	module,
	onClick,
}: {
	module: ModuleDefinition
	onClick: () => void
}) {
	const color = module.color ?? FC.blue
	const Icon = module.icon

	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				flex: '1 1 0',
				minWidth: 0,
				background: FC.surface,
				border: `1px solid ${FC.line}`,
				borderRadius: 18,
				padding: '14px 12px',
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				gap: 10,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<div
				style={{
					width: 36,
					height: 36,
					borderRadius: 12,
					background: `${color}18`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<Icon size={18} color={color} strokeWidth={1.8} />
			</div>
			<span style={{ color: FC.fg, fontSize: 13, fontWeight: 700 }}>
				{module.name}
			</span>
		</button>
	)
}

export function ModuleReturnLink({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				background: 'none',
				border: 'none',
				padding: 0,
				marginBottom: 10,
				color: FC.mid,
				fontSize: 12,
				fontWeight: 600,
				cursor: 'pointer',
				fontFamily: 'inherit',
			}}
		>
			← Modules
		</button>
	)
}
