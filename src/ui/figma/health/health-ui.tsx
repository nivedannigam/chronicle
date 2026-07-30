import type { ReactNode } from 'react'
import { ArrowLeft, Loader2, Search } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AppShell } from '@/components/layout/mobile'
import { C, screenTitleStyle } from '@/constants/colors'
import { healthPrimaryButtonStyle } from '@/ui/figma/health/health-ui.styles'

export function HealthFilterChip({
	label,
	active,
	onClick,
}: {
	label: string
	active: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				flexShrink: 0,
				background: active ? C.accentBlue : C.card,
				border: active ? 'none' : `1px solid ${C.border}`,
				borderRadius: 100,
				padding: '7px 16px',
				fontSize: 13,
				fontWeight: active ? 700 : 400,
				color: active ? '#fff' : C.textSec,
				cursor: 'pointer',
				fontFamily: 'inherit',
				minHeight: 36,
			}}
		>
			{label}
		</button>
	)
}

export function HealthSearchField({
	value,
	onChange,
	placeholder,
	ariaLabel,
}: {
	value: string
	onChange: (value: string) => void
	placeholder: string
	ariaLabel: string
}) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 10,
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 14,
				padding: '11px 14px',
				marginBottom: 12,
			}}
		>
			<Search size={16} color={C.textMuted} />
			<input
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				aria-label={ariaLabel}
				style={{
					flex: 1,
					background: 'none',
					border: 'none',
					outline: 'none',
					fontSize: 14,
					color: C.text,
					fontFamily: 'inherit',
				}}
			/>
		</div>
	)
}

export function HealthPageIntro({ children }: { children: ReactNode }) {
	return (
		<div
			style={{
				fontSize: 14,
				color: C.textSec,
				marginBottom: 16,
				lineHeight: 1.55,
			}}
		>
			{children}
		</div>
	)
}

export function HealthSubpageHeader({
	backLabel,
	onBack,
	title,
	subtitle,
	badge,
}: {
	backLabel: string
	onBack: () => void
	title?: string
	subtitle?: ReactNode
	badge?: ReactNode
}) {
	return (
		<div
			style={{
				position: 'sticky',
				top: 0,
				zIndex: 10,
				background: C.bg,
				paddingTop: 4,
				paddingBottom: 14,
				marginBottom: 4,
				borderBottom: `1px solid ${C.border}`,
			}}
		>
			<button
				type="button"
				onClick={onBack}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: '0 0 12px',
					cursor: 'pointer',
					color: C.textSec,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			>
				<ArrowLeft size={18} />
				{backLabel}
			</button>
			{title ? (
				<div
					style={{
						display: 'flex',
						alignItems: 'flex-start',
						justifyContent: 'space-between',
						gap: 12,
					}}
				>
					<div style={{ flex: 1, minWidth: 0 }}>
						<div
							style={{ ...screenTitleStyle, marginBottom: subtitle ? 6 : 0 }}
						>
							{title}
						</div>
						{subtitle ? (
							<div
								style={{ fontSize: 13, color: C.textMuted, lineHeight: 1.45 }}
							>
								{subtitle}
							</div>
						) : null}
					</div>
					{badge}
				</div>
			) : null}
		</div>
	)
}

export function HealthSettingRow({
	icon: Icon,
	label,
	value,
	actionLabel,
	onAction,
	disabled = false,
	tone = 'muted',
}: {
	icon: LucideIcon
	label: string
	value: string
	actionLabel: string
	onAction: () => void
	disabled?: boolean
	tone?: 'success' | 'muted'
}) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 12,
				padding: '14px 16px',
				borderRadius: 18,
				border: `1px solid ${C.border}`,
				background: C.card,
			}}
		>
			<div
				style={{
					width: 40,
					height: 40,
					borderRadius: 12,
					background: C.card2,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				<Icon size={18} color={tone === 'success' ? C.greenAlt : C.textSec} />
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
				<div
					style={{
						fontSize: 12,
						color: tone === 'success' ? C.greenAlt : C.textMuted,
					}}
				>
					{value}
				</div>
			</div>
			<button
				type="button"
				onClick={onAction}
				disabled={disabled}
				style={{
					...healthPrimaryButtonStyle,
					opacity: disabled ? 0.6 : 1,
					cursor: disabled ? 'not-allowed' : 'pointer',
				}}
			>
				{disabled && actionLabel.includes('…') ? (
					<Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
				) : null}
				{actionLabel}
			</button>
		</div>
	)
}

export function HealthActionChip({
	icon: Icon,
	label,
	onClick,
	disabled = false,
	destructive = false,
}: {
	icon: LucideIcon
	label: string
	onClick: () => void
	disabled?: boolean
	destructive?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				background: destructive ? `${C.red}18` : C.card,
				border: `1px solid ${destructive ? `${C.red}44` : C.border}`,
				borderRadius: 100,
				padding: '8px 14px',
				fontSize: 12,
				fontWeight: 700,
				color: destructive ? C.red : C.textSec,
				cursor: disabled ? 'not-allowed' : 'pointer',
				fontFamily: 'inherit',
				opacity: disabled ? 0.7 : 1,
				minHeight: 36,
			}}
		>
			{disabled && label.includes('…') ? (
				<Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
			) : (
				<Icon size={14} />
			)}
			{label}
		</button>
	)
}

export function HealthAlertBanner({
	message,
	actionLabel,
	onAction,
	disabled = false,
	tone = 'error',
}: {
	message: ReactNode
	actionLabel?: string
	onAction?: () => void
	disabled?: boolean
	tone?: 'error' | 'warning'
}) {
	const color = tone === 'error' ? C.red : C.orange

	return (
		<div
			style={{
				background: `${color}14`,
				border: `1px solid ${color}33`,
				borderRadius: 18,
				padding: '14px 16px',
				fontSize: 13,
				color,
				lineHeight: 1.5,
				marginBottom: 16,
			}}
		>
			{message}
			{actionLabel && onAction ? (
				<button
					type="button"
					onClick={onAction}
					disabled={disabled}
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						marginTop: 10,
						background: color,
						color: C.white,
						border: 'none',
						borderRadius: 100,
						padding: '8px 14px',
						fontSize: 12,
						fontWeight: 700,
						cursor: disabled ? 'not-allowed' : 'pointer',
						fontFamily: 'inherit',
						opacity: disabled ? 0.7 : 1,
					}}
				>
					{disabled ? (
						<Loader2
							size={12}
							style={{ animation: 'spin 1s linear infinite' }}
						/>
					) : null}
					{actionLabel}
				</button>
			) : null}
		</div>
	)
}

export function HealthMetaGrid({
	rows,
}: {
	rows: { label: string; value: string }[]
}) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 18,
				padding: '14px 16px',
				display: 'grid',
				gap: 8,
				marginBottom: 16,
			}}
		>
			{rows.map((row) => (
				<div
					key={row.label}
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						gap: 12,
						fontSize: 13,
					}}
				>
					<span style={{ color: C.textMuted }}>{row.label}</span>
					<span style={{ color: C.textSec, textAlign: 'right' }}>
						{row.value}
					</span>
				</div>
			))}
		</div>
	)
}

export function HealthScreen({
	children,
	padding,
	paddingX = 18,
	paddingTop = 0,
	paddingBottom = 0,
	nested = true,
}: {
	children: ReactNode
	padding?: string
	paddingX?: number
	paddingTop?: number
	paddingBottom?: number
	nested?: boolean
}) {
	const resolved = parseHealthScreenPadding(padding)

	return (
		<AppShell
			paddingX={resolved?.paddingX ?? paddingX}
			paddingTop={resolved?.paddingTop ?? paddingTop}
			paddingBottom={resolved?.paddingBottom ?? paddingBottom}
			nested={nested}
			style={{ minHeight: '100%', color: C.text }}
		>
			{children}
		</AppShell>
	)
}

function parseHealthScreenPadding(padding?: string): {
	paddingTop: number
	paddingX: number
	paddingBottom: number
} | null {
	if (!padding) {
		return null
	}

	const parts = padding
		.trim()
		.split(/\s+/)
		.map((part) => parseInt(part, 10))

	if (parts.length === 1) {
		return {
			paddingTop: parts[0],
			paddingX: parts[0],
			paddingBottom: parts[0],
		}
	}

	if (parts.length === 2) {
		return {
			paddingTop: parts[0],
			paddingX: parts[1],
			paddingBottom: parts[0],
		}
	}

	if (parts.length === 3) {
		return {
			paddingTop: parts[0],
			paddingX: parts[1],
			paddingBottom: parts[2],
		}
	}

	return {
		paddingTop: parts[0],
		paddingX: parts[1],
		paddingBottom: parts[2],
	}
}
