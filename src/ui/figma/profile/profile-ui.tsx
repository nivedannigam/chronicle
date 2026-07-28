import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function ProfilePageShell({
	title,
	subtitle,
	onBack,
	backLabel = 'Profile',
	children,
	padding = '0 22px 24px',
}: {
	title?: string
	subtitle?: ReactNode
	onBack?: () => void
	backLabel?: string
	children: ReactNode
	padding?: string
}) {
	return (
		<div style={{ padding, minHeight: 0 }}>
			{onBack ? (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 10,
						padding: '8px 0 16px',
					}}
				>
					<button
						type="button"
						onClick={onBack}
						aria-label={`Back to ${backLabel}`}
						style={{
							width: 36,
							height: 36,
							borderRadius: 12,
							background: FC.surface,
							border: `1px solid ${FC.line}`,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							cursor: 'pointer',
							flexShrink: 0,
						}}
					>
						<ArrowLeft size={17} color={FC.mid} />
					</button>
					{title ? (
						<div style={{ minWidth: 0 }}>
							<h1
								style={{
									color: FC.fg,
									fontSize: 22,
									fontWeight: 700,
									letterSpacing: -0.6,
									margin: 0,
									lineHeight: 1.2,
								}}
							>
								{title}
							</h1>
							{subtitle ? (
								<p
									style={{
										color: FC.mid,
										fontSize: 13,
										margin: '4px 0 0',
										lineHeight: 1.4,
									}}
								>
									{subtitle}
								</p>
							) : null}
						</div>
					) : null}
				</div>
			) : null}
			{children}
		</div>
	)
}

export function ProfileAvatar({
	name,
	avatarUrl,
	size = 96,
}: {
	name: string
	avatarUrl?: string | null
	size?: number
}) {
	const initial = name.trim().charAt(0).toUpperCase() || '?'

	if (avatarUrl) {
		return (
			<img
				src={avatarUrl}
				alt=""
				style={{
					width: size,
					height: size,
					borderRadius: size / 2,
					objectFit: 'cover',
					boxShadow: '0 10px 32px rgba(59,130,246,0.35)',
				}}
			/>
		)
	}

	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: size / 2,
				background: `linear-gradient(135deg,${FC.blue},${FC.indigo})`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				boxShadow: '0 10px 32px rgba(59,130,246,0.35)',
			}}
		>
			<span
				style={{
					color: '#fff',
					fontSize: size * 0.38,
					fontWeight: 700,
					lineHeight: 1,
				}}
			>
				{initial}
			</span>
		</div>
	)
}

export function ProfileSectionCard({
	title,
	children,
	style,
}: {
	title: string
	children: ReactNode
	style?: CSSProperties
}) {
	return (
		<div style={{ marginBottom: 18, ...style }}>
			<p
				style={{
					color: 'rgba(255,255,255,0.28)',
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					margin: '0 0 10px',
				}}
			>
				{title}
			</p>
			<div style={{ ...figmaCardStyle, borderRadius: 22, overflow: 'hidden' }}>
				{children}
			</div>
		</div>
	)
}

export function ProfileNavRow({
	icon: Icon,
	label,
	subtitle,
	onClick,
	iconBg = FC.blue,
	isLast = false,
}: {
	icon: LucideIcon
	label: string
	subtitle?: string
	onClick: () => void
	iconBg?: string
	isLast?: boolean
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 13,
				padding: '14px 18px',
				borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.05)',
				cursor: 'pointer',
				width: '100%',
				background: 'none',
				borderLeft: 'none',
				borderRight: 'none',
				borderTop: 'none',
				fontFamily: 'inherit',
				textAlign: 'left',
				minHeight: 56,
			}}
		>
			<div
				style={{
					width: 36,
					height: 36,
					borderRadius: 10,
					flexShrink: 0,
					background: iconBg,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					boxShadow: `0 2px 8px ${iconBg}40`,
				}}
			>
				<Icon size={17} color="#fff" strokeWidth={2} />
			</div>
			<div style={{ flex: 1, minWidth: 0 }}>
				<p
					style={{
						color: FC.fg,
						fontSize: 15,
						fontWeight: 600,
						margin: 0,
						letterSpacing: -0.2,
					}}
				>
					{label}
				</p>
				{subtitle ? (
					<p
						style={{
							color: 'rgba(255,255,255,0.35)',
							fontSize: 12.5,
							margin: '3px 0 0',
							lineHeight: 1.35,
						}}
					>
						{subtitle}
					</p>
				) : null}
			</div>
			<ChevronRight size={15} color="rgba(255,255,255,0.18)" />
		</button>
	)
}

export function ProfileStatTile({
	value,
	label,
	onClick,
	accent = FC.blue,
}: {
	value: string
	label: string
	onClick?: () => void
	accent?: string
}) {
	const Tag = onClick ? 'button' : 'div'

	return (
		<Tag
			type={onClick ? 'button' : undefined}
			onClick={onClick}
			style={{
				background: `linear-gradient(145deg,${accent}12,${accent}05)`,
				border: `1px solid ${accent}22`,
				borderRadius: 18,
				padding: '14px 14px 12px',
				textAlign: 'left',
				cursor: onClick ? 'pointer' : 'default',
				fontFamily: 'inherit',
				width: '100%',
			}}
		>
			<p
				style={{
					color: FC.fg,
					fontSize: 22,
					fontWeight: 700,
					letterSpacing: -0.8,
					margin: '0 0 4px',
					lineHeight: 1,
				}}
			>
				{value}
			</p>
			<p
				style={{
					color: accent,
					fontSize: 11.5,
					fontWeight: 600,
					margin: 0,
					letterSpacing: '0.02em',
				}}
			>
				{label}
			</p>
		</Tag>
	)
}

export function ProfileConnectionChip({
	label,
	status,
	color = FC.green,
}: {
	label: string
	status: string
	color?: string
}) {
	return (
		<div
			style={{
				display: 'inline-flex',
				alignItems: 'center',
				gap: 6,
				background: `${color}12`,
				border: `1px solid ${color}28`,
				borderRadius: 20,
				padding: '6px 12px',
			}}
		>
			<div
				style={{
					width: 6,
					height: 6,
					borderRadius: 3,
					background: color,
				}}
			/>
			<span style={{ color: FC.fg, fontSize: 12, fontWeight: 500 }}>
				{label}
			</span>
			<span style={{ color: color, fontSize: 11, fontWeight: 600 }}>
				{status}
			</span>
		</div>
	)
}

export function ProfileSearchField({
	value,
	onChange,
	placeholder,
}: {
	value: string
	onChange: (value: string) => void
	placeholder: string
}) {
	return (
		<input
			value={value}
			onChange={(event) => onChange(event.target.value)}
			placeholder={placeholder}
			aria-label={placeholder}
			style={{
				width: '100%',
				boxSizing: 'border-box',
				background: FC.surface,
				border: `1px solid ${FC.line}`,
				borderRadius: 16,
				padding: '13px 16px',
				color: FC.fg,
				fontSize: 15,
				fontFamily: 'inherit',
				marginBottom: 16,
				outline: 'none',
			}}
		/>
	)
}
