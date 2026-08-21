import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, FigmaIconBox, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function ModuleSettingsSection({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	return (
		<section style={{ marginBottom: 24 }}>
			<div style={{ marginBottom: 12 }}>
				<FigmaHealthSectionLabel>{label}</FigmaHealthSectionLabel>
			</div>
			<div style={{ display: 'grid', gap: 12 }}>{children}</div>
		</section>
	)
}

export function ModuleSettingsRow({
	icon: Icon,
	color,
	title,
	subtitle,
	actionLabel,
	onAction,
	disabled,
	tone,
	secondaryActionLabel,
	onSecondaryAction,
}: {
	icon: LucideIcon
	color: string
	title: string
	subtitle: string
	actionLabel: string
	onAction: () => void
	disabled?: boolean
	tone?: 'danger'
	secondaryActionLabel?: string
	onSecondaryAction?: () => void
}) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 20,
				padding: '16px 18px',
				display: 'flex',
				alignItems: 'center',
				gap: 13,
			}}
		>
			<FigmaIconBox color={color} size={42}>
				<Icon size={18} color={color} strokeWidth={1.8} />
			</FigmaIconBox>
			<div style={{ flex: 1, minWidth: 0 }}>
				<p
					style={{
						color: FC.fg,
						fontSize: 14.5,
						fontWeight: 600,
						margin: '0 0 3px',
					}}
				>
					{title}
				</p>
				<p style={{ color: FC.mid, fontSize: 12.5, margin: 0 }}>{subtitle}</p>
			</div>
			<div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
				{secondaryActionLabel && onSecondaryAction ? (
					<ModuleSettingsButton
						label={secondaryActionLabel}
						onClick={onSecondaryAction}
						disabled={disabled}
					/>
				) : null}
				<ModuleSettingsButton
					label={actionLabel}
					onClick={onAction}
					disabled={disabled}
					tone={tone}
				/>
			</div>
		</div>
	)
}

export function ModuleSettingsButton({
	label,
	onClick,
	disabled,
	tone,
}: {
	label: string
	onClick: () => void
	disabled?: boolean
	tone?: 'danger' | 'primary'
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			style={{
				background:
					tone === 'danger'
						? `${FC.orange}18`
						: tone === 'primary'
							? FC.blue
							: FC.ghost,
				border: `1px solid ${
					tone === 'danger'
						? `${FC.orange}35`
						: tone === 'primary'
							? FC.blue
							: FC.line
				}`,
				borderRadius: 12,
				padding: '7px 15px',
				cursor: disabled ? 'default' : 'pointer',
				opacity: disabled ? 0.5 : 1,
				fontFamily: 'inherit',
				flexShrink: 0,
			}}
		>
			<span
				style={{
					color:
						tone === 'danger'
							? FC.orange
							: tone === 'primary'
								? '#fff'
								: FC.mid,
					fontSize: 13,
					fontWeight: tone === 'danger' || tone === 'primary' ? 700 : 500,
				}}
			>
				{label}
			</span>
		</button>
	)
}

export function ModuleSettingsEmptyCard({
	headline,
	message,
	actionLabel,
	onAction,
}: {
	headline?: string
	message: string
	actionLabel: string
	onAction: () => void
}) {
	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 20,
				padding: '16px 18px',
			}}
		>
			{headline ? (
				<p
					style={{
						color: FC.fg,
						fontSize: 17,
						fontWeight: 700,
						margin: '0 0 8px',
						letterSpacing: '-0.02em',
					}}
				>
					{headline}
				</p>
			) : null}
			<p
				style={{
					color: FC.mid,
					fontSize: 14,
					lineHeight: 1.5,
					margin: headline ? '0 0 12px' : '0 0 12px',
				}}
			>
				{message}
			</p>
			<ModuleSettingsButton
				label={actionLabel}
				onClick={onAction}
				tone="primary"
			/>
		</div>
	)
}

export function ModuleSettingsAdvancedSection({
	label,
	children,
}: {
	label: string
	children: ReactNode
}) {
	const [open, setOpen] = useState(false)

	return (
		<section style={{ marginBottom: 24 }}>
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					width: '100%',
					background: 'none',
					border: 'none',
					padding: '0 0 12px',
					cursor: 'pointer',
					fontFamily: 'inherit',
				}}
			>
				<FigmaHealthSectionLabel>{label}</FigmaHealthSectionLabel>
				<ChevronDown
					size={18}
					color={FC.mid}
					style={{
						transform: open ? 'rotate(180deg)' : 'none',
						transition: 'transform 0.2s ease',
					}}
				/>
			</button>

			{open ? <div style={{ display: 'grid', gap: 12 }}>{children}</div> : null}
		</section>
	)
}

export function ModuleSettingsConnectedFolderCard({
	moduleLabel,
	driveConnected,
	driveLabel,
	folderName,
	folderPath,
	documentCount,
	lastScannedLabel,
	onOpenFolder,
	onChangeFolder,
	onConnectDrive,
	isLoading,
	setupHeadline,
	setupMessage,
	setupActionLabel,
	driveDisconnectedMessage,
}: {
	moduleLabel: string
	driveConnected: boolean
	driveLabel: string
	folderName: string | null
	folderPath: string | null
	documentCount: number
	lastScannedLabel: string | null
	onOpenFolder: () => void
	onChangeFolder: () => void
	onConnectDrive: () => void
	isLoading?: boolean
	setupHeadline?: string
	setupMessage?: string
	setupActionLabel?: string
	driveDisconnectedMessage?: string
}) {
	if (isLoading) {
		return (
			<div
				style={{
					...figmaCardStyle,
					borderRadius: 20,
					padding: '18px 20px',
				}}
			>
				<p style={{ color: FC.dim, fontSize: 13, margin: 0 }}>Loading…</p>
			</div>
		)
	}

	if (!driveConnected) {
		return (
			<ModuleSettingsEmptyCard
				headline={setupHeadline}
				message={
					driveDisconnectedMessage ??
					`Connect Google Drive and choose your ${moduleLabel.toLowerCase()} folder. Chronicle will automatically organize your policies.`
				}
				actionLabel="Connect Google Drive"
				onAction={onConnectDrive}
			/>
		)
	}

	if (!folderName) {
		return (
			<ModuleSettingsEmptyCard
				headline={setupHeadline}
				message={
					setupMessage ??
					`Choose the Google Drive folder where your ${moduleLabel.toLowerCase()} documents are stored.`
				}
				actionLabel={setupActionLabel ?? `Choose ${moduleLabel} folder`}
				onAction={onChangeFolder}
			/>
		)
	}

	return (
		<div
			style={{
				...figmaCardStyle,
				borderRadius: 20,
				padding: '18px 20px',
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'flex-start',
					justifyContent: 'space-between',
					gap: 12,
					marginBottom: 16,
				}}
			>
				<div>
					<p
						style={{
							color: FC.dim,
							fontSize: 11,
							fontWeight: 700,
							textTransform: 'uppercase',
							letterSpacing: '0.06em',
							margin: '0 0 6px',
						}}
					>
						{moduleLabel}
					</p>
					<p
						style={{
							color: FC.fg,
							fontSize: 17,
							fontWeight: 700,
							margin: '0 0 4px',
							letterSpacing: '-0.02em',
						}}
					>
						{folderName}
					</p>
					<p style={{ color: FC.mid, fontSize: 12.5, margin: 0 }}>
						Google Drive · {folderPath ?? driveLabel}
					</p>
				</div>
				<span
					style={{
						background: `${FC.green}18`,
						color: FC.green,
						fontSize: 11,
						fontWeight: 700,
						padding: '4px 10px',
						borderRadius: 100,
						flexShrink: 0,
					}}
				>
					Connected
				</span>
			</div>

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: 12,
					marginBottom: 16,
				}}
			>
				<StatBlock label="Documents found" value={`${documentCount}`} />
				<StatBlock label="Last scanned" value={lastScannedLabel ?? 'Not yet'} />
			</div>

			<div style={{ display: 'flex', gap: 8 }}>
				<ModuleSettingsButton
					label="Open folder"
					onClick={onOpenFolder}
					disabled={!folderName}
				/>
				<ModuleSettingsButton label="Change folder" onClick={onChangeFolder} />
			</div>
		</div>
	)
}

function StatBlock({ label, value }: { label: string; value: string }) {
	return (
		<div
			style={{
				background: FC.ghost,
				borderRadius: 14,
				padding: '12px 14px',
			}}
		>
			<p
				style={{
					color: FC.dim,
					fontSize: 11,
					fontWeight: 600,
					margin: '0 0 4px',
					textTransform: 'uppercase',
					letterSpacing: '0.04em',
				}}
			>
				{label}
			</p>
			<p
				style={{
					color: FC.fg,
					fontSize: 15,
					fontWeight: 700,
					margin: 0,
				}}
			>
				{value}
			</p>
		</div>
	)
}
