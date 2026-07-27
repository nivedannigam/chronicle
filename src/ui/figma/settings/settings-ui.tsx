import type { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { C } from '@/constants/colors'
import { FigmaCard } from '@/ui/figma/components/primitives'
import {
	HealthPageIntro,
	HealthScreen,
	HealthSubpageHeader,
} from '@/ui/figma/health/health-ui'

export function SettingsPageShell({
	backLabel,
	onBack,
	title,
	subtitle,
	children,
}: {
	backLabel: string
	onBack: () => void
	title: string
	subtitle?: ReactNode
	children: ReactNode
}) {
	return (
		<HealthScreen padding="0 18px 20px">
			<HealthSubpageHeader
				backLabel={backLabel}
				onBack={onBack}
				title={title}
				subtitle={subtitle}
			/>
			{children}
		</HealthScreen>
	)
}

export function SettingsIntro({ children }: { children: ReactNode }) {
	return <HealthPageIntro>{children}</HealthPageIntro>
}

export interface SettingsMenuItem {
	icon: LucideIcon
	label: string
	hint?: string
	path?: string
	destructive?: boolean
	onClick?: () => void
}

export function SettingsMenuGroup({
	items,
	onNavigate,
}: {
	items: SettingsMenuItem[]
	onNavigate: (path: string) => void
}) {
	return (
		<FigmaCard style={{ marginBottom: 14 }}>
			{items.map((item, index) => (
				<SettingsMenuRow
					key={item.label}
					item={item}
					isLast={index === items.length - 1}
					onNavigate={onNavigate}
				/>
			))}
		</FigmaCard>
	)
}

function SettingsMenuRow({
	item,
	isLast,
	onNavigate,
}: {
	item: SettingsMenuItem
	isLast: boolean
	onNavigate: (path: string) => void
}) {
	const { icon: Icon, label, hint, path, destructive = false, onClick } = item

	return (
		<button
			type="button"
			onClick={() => {
				if (onClick) {
					onClick()
					return
				}

				if (path) {
					onNavigate(path)
				}
			}}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 12,
				width: '100%',
				padding: '14px 16px',
				background: 'transparent',
				border: 'none',
				borderBottom: isLast ? 'none' : `1px solid ${C.border}`,
				cursor: 'pointer',
				fontFamily: 'inherit',
				textAlign: 'left',
			}}
		>
			<div
				style={{
					width: 36,
					height: 36,
					borderRadius: 11,
					background: destructive ? `${C.red}14` : C.card2,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				<Icon size={18} color={destructive ? C.red : C.textSec} />
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						fontSize: 15,
						fontWeight: 600,
						color: destructive ? C.red : C.text,
					}}
				>
					{label}
				</div>
				{hint ? (
					<div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
						{hint}
					</div>
				) : null}
			</div>
			<ChevronRight size={16} color={C.textMuted} />
		</button>
	)
}

export function SettingsPrimaryButton({
	children,
	onClick,
	disabled = false,
}: {
	children: ReactNode
	onClick: () => void
	disabled?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{
				width: '100%',
				padding: '12px 16px',
				borderRadius: 100,
				border: 'none',
				background: C.accentBlue,
				color: C.white,
				fontSize: 14,
				fontWeight: 700,
				cursor: disabled ? 'not-allowed' : 'pointer',
				fontFamily: 'inherit',
				opacity: disabled ? 0.7 : 1,
				minHeight: 44,
			}}
		>
			{children}
		</button>
	)
}

export function SettingsDestructiveButton({
	children,
	onClick,
	disabled = false,
}: {
	children: ReactNode
	onClick: () => void
	disabled?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{
				width: '100%',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 8,
				padding: '14px 16px',
				marginTop: 8,
				borderRadius: 18,
				border: `1px solid ${C.red}44`,
				background: `${C.red}14`,
				color: C.red,
				fontSize: 15,
				fontWeight: 700,
				cursor: disabled ? 'not-allowed' : 'pointer',
				fontFamily: 'inherit',
				opacity: disabled ? 0.7 : 1,
			}}
		>
			{children}
		</button>
	)
}
