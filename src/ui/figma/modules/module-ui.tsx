import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ModuleDefinition } from '@/types/modules'
import type {
	ModuleHubCardViewModel,
	ModuleHubStatusTone,
} from '@/features/modules/types/module-hub.types'
import { resolveModuleHubCardAction } from '@/features/modules/services/module-hub-status.service'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

function statusToneColor(tone: ModuleHubStatusTone): string {
	switch (tone) {
		case 'positive':
			return FC.green
		case 'attention':
			return FC.amber
		case 'muted':
			return FC.dim
		default:
			return FC.mid
	}
}

export function ModuleHubCard({
	card,
	onNavigate,
}: {
	card: ModuleHubCardViewModel
	onNavigate: (path: string) => void
}) {
	const Icon = card.icon
	const action = resolveModuleHubCardAction(card)
	const statusColor = statusToneColor(card.statusTone)

	return (
		<button
			type="button"
			onClick={() => onNavigate(action.path)}
			style={{
				width: '100%',
				...figmaCardStyle,
				borderRadius: 20,
				padding: '18px 18px 16px',
				display: 'flex',
				alignItems: 'flex-start',
				gap: 14,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<div
				style={{
					width: 44,
					height: 44,
					borderRadius: 14,
					background: 'rgba(255,255,255,0.04)',
					border: `1px solid ${FC.line}`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				<Icon size={22} color={card.color} strokeWidth={1.6} />
			</div>

			<div style={{ flex: 1, minWidth: 0 }}>
				<p
					style={{
						color: FC.fg,
						fontSize: 17,
						fontWeight: 700,
						margin: '0 0 4px',
						letterSpacing: -0.2,
					}}
				>
					{card.name}
				</p>
				<p
					style={{
						color: FC.dim,
						fontSize: 13,
						margin: '0 0 10px',
						lineHeight: 1.45,
					}}
				>
					{card.description}
				</p>
				<p
					style={{
						color: statusColor,
						fontSize: 13,
						fontWeight: 600,
						margin: 0,
						lineHeight: 1.4,
					}}
				>
					{card.statusLine}
				</p>
				{card.actionLabel && card.state === 'setup_required' ? (
					<span
						style={{
							display: 'inline-block',
							marginTop: 10,
							color: FC.fg,
							fontSize: 13,
							fontWeight: 600,
							padding: '6px 12px',
							borderRadius: 999,
							background: 'rgba(255,255,255,0.06)',
							border: `1px solid ${FC.line}`,
						}}
					>
						{card.actionLabel}
					</span>
				) : null}
			</div>

			<ChevronRight
				size={18}
				color={FC.mid}
				style={{ flexShrink: 0, marginTop: 4 }}
			/>
		</button>
	)
}

export function ModuleHubSkeleton() {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
			{[0, 1, 2, 3].map((index) => (
				<div
					key={index}
					style={{
						...figmaCardStyle,
						borderRadius: 20,
						height: 112,
						opacity: 0.55,
					}}
				/>
			))}
		</div>
	)
}

export function ModuleComingSoonCard({ module }: { module: ModuleDefinition }) {
	return <ModuleFutureCard module={module} />
}

export function ModuleFutureCard({ module }: { module: ModuleDefinition }) {
	const color = module.color ?? FC.mid
	const Icon = module.icon

	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 18,
				padding: '16px 14px',
				opacity: 0.72,
			}}
		>
			<div
				style={{
					width: 36,
					height: 36,
					borderRadius: 12,
					background: 'rgba(255,255,255,0.03)',
					border: `1px solid ${FC.line}`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					marginBottom: 12,
				}}
			>
				<Icon size={18} color={color} strokeWidth={1.5} />
			</div>
			<p
				style={{
					color: FC.fg,
					fontSize: 14,
					fontWeight: 700,
					margin: '0 0 4px',
				}}
			>
				{module.name}
			</p>
			<p
				style={{
					color: FC.dim,
					fontSize: 12,
					margin: '0 0 8px',
					lineHeight: 1.4,
				}}
			>
				{module.description}
			</p>
			<span style={{ color: FC.dim, fontSize: 11, fontWeight: 600 }}>
				Coming soon
			</span>
		</div>
	)
}

export function HomeModuleSnapshotRow({
	card,
	onClick,
}: {
	card: ModuleHubCardViewModel
	onClick: () => void
}) {
	const statusColor = statusToneColor(card.statusTone)

	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				width: '100%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'space-between',
				gap: 12,
				padding: '13px 0',
				background: 'none',
				border: 'none',
				borderBottom: `1px solid ${FC.line}`,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<div style={{ minWidth: 0 }}>
				<p
					style={{
						color: FC.fg,
						fontSize: 14,
						fontWeight: 600,
						margin: '0 0 2px',
					}}
				>
					{card.name}
				</p>
				<p style={{ color: statusColor, fontSize: 12, margin: 0 }}>
					{card.statusLine}
				</p>
			</div>
			<ChevronRight size={16} color={FC.mid} />
		</button>
	)
}

/** @deprecated Use ModuleHubCard */
export function ModuleLauncherCard({
	module,
	onClick,
}: {
	module: ModuleDefinition
	documentCount?: number
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				width: '100%',
				...figmaCardStyle,
				borderRadius: 20,
				padding: '18px 20px',
				display: 'flex',
				alignItems: 'center',
				gap: 16,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<p style={{ color: FC.fg, fontSize: 16, fontWeight: 700, margin: 0 }}>
				{module.name}
			</p>
		</button>
	)
}

/** @deprecated Use HomeModuleSnapshotRow */
export function HomeModuleCard({
	module,
	onClick,
}: {
	module: ModuleDefinition
	onClick: () => void
}) {
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
					background: 'rgba(255,255,255,0.04)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<Icon size={18} color={module.color ?? FC.blue} strokeWidth={1.8} />
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

export function ModulesScreenHeader({
	eyebrow = 'Chronicle',
	title = 'Modules',
	subtitle = 'Your life, organized.',
}: {
	eyebrow?: string
	title?: string
	subtitle?: string
}) {
	return (
		<div style={{ marginBottom: 24 }}>
			<p
				style={{
					color: FC.dim,
					fontSize: 12,
					fontWeight: 600,
					letterSpacing: '0.06em',
					textTransform: 'uppercase',
					margin: '0 0 8px',
				}}
			>
				{eyebrow}
			</p>
			<h1
				style={{
					color: FC.fg,
					fontSize: 32,
					fontWeight: 700,
					letterSpacing: -1.2,
					margin: '0 0 6px',
					lineHeight: 1.1,
				}}
			>
				{title}
			</h1>
			<p style={{ color: FC.mid, fontSize: 15, margin: 0, lineHeight: 1.45 }}>
				{subtitle}
			</p>
		</div>
	)
}

export function ModuleSectionLabel({ children }: { children: ReactNode }) {
	return (
		<p
			style={{
				color: FC.dim,
				fontSize: 11,
				fontWeight: 700,
				letterSpacing: '0.08em',
				textTransform: 'uppercase',
				margin: '0 0 12px',
			}}
		>
			{children}
		</p>
	)
}
