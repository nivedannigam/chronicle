import type { ReactNode } from 'react'
import { Cloud, Download, Eye, Folder, Unplug } from 'lucide-react'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, FigmaIconBox, figmaCardStyle } from '@/ui/figma/v2/atoms'

interface FolderAssignment {
	id: string
	folderName: string
}

export function FigmaHealthSettingsView({
	driveConnected,
	memberLabel,
	assignments,
	isLoadingAssignments,
	onConnectDrive,
	onChooseFolder,
	onChangeFolder,
	onPrivacy,
	onExport,
	onDisconnect,
	isDisconnecting,
}: {
	driveConnected: boolean
	memberLabel: string
	assignments: FolderAssignment[]
	isLoadingAssignments: boolean
	onConnectDrive: () => void
	onChooseFolder: () => void
	onChangeFolder: () => void
	onPrivacy: () => void
	onExport: () => void
	onDisconnect: () => void
	isDisconnecting?: boolean
}) {
	return (
		<div style={{ paddingBottom: 32 }}>
			<Section label="Google Drive">
				<Row
					icon={Cloud}
					color={driveConnected ? FC.green : FC.amber}
					title="Google Drive"
					subtitle={
						driveConnected
							? 'Connected to your account'
							: 'Connect to import health records'
					}
					actionLabel={driveConnected ? 'Manage' : 'Connect'}
					onAction={onConnectDrive}
				/>
			</Section>

			<Section label="Assigned folder">
				{isLoadingAssignments ? (
					<p style={{ color: FC.dim, fontSize: 13, margin: 0 }}>Loading…</p>
				) : assignments.length === 0 ? (
					<div
						style={{
							...figmaCardStyle,
							borderRadius: 20,
							padding: '16px 18px',
						}}
					>
						<p
							style={{
								color: FC.mid,
								fontSize: 14,
								lineHeight: 1.5,
								margin: '0 0 12px',
							}}
						>
							No health folder assigned for {memberLabel} yet.
						</p>
						<ActionButton
							label="Choose health folder"
							onClick={onChooseFolder}
						/>
					</div>
				) : (
					assignments.map((assignment) => (
						<Row
							key={assignment.id}
							icon={Folder}
							color={FC.blue}
							title={memberLabel}
							subtitle={assignment.folderName}
							actionLabel="Change"
							onAction={onChangeFolder}
						/>
					))
				)}
			</Section>

			<Section label="Privacy">
				<Row
					icon={Eye}
					color={FC.purple}
					title="Health data"
					subtitle="Stored securely in your account"
					actionLabel="Manage"
					onAction={onPrivacy}
				/>
			</Section>

			<Section label="Export">
				<Row
					icon={Download}
					color={FC.teal}
					title="Export your data"
					subtitle="Download a copy of your health records"
					actionLabel="Export"
					onAction={onExport}
				/>
			</Section>

			<Section label="Disconnect">
				<Row
					icon={Unplug}
					color={FC.orange}
					title="Disconnect Google Drive"
					subtitle="Stop syncing new reports from Drive"
					actionLabel={isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
					onAction={onDisconnect}
					disabled={!driveConnected || isDisconnecting}
					tone="danger"
				/>
			</Section>
		</div>
	)
}

function Section({ label, children }: { label: string; children: ReactNode }) {
	return (
		<section style={{ marginBottom: 24 }}>
			<div style={{ marginBottom: 12 }}>
				<FigmaHealthSectionLabel>{label}</FigmaHealthSectionLabel>
			</div>
			<div style={{ display: 'grid', gap: 12 }}>{children}</div>
		</section>
	)
}

function Row({
	icon: Icon,
	color,
	title,
	subtitle,
	actionLabel,
	onAction,
	disabled,
	tone,
}: {
	icon: typeof Cloud
	color: string
	title: string
	subtitle: string
	actionLabel: string
	onAction: () => void
	disabled?: boolean
	tone?: 'danger'
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
			<button
				type="button"
				onClick={onAction}
				disabled={disabled}
				style={{
					background: tone === 'danger' ? `${FC.orange}18` : FC.ghost,
					border: `1px solid ${tone === 'danger' ? `${FC.orange}35` : FC.line}`,
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
						color: tone === 'danger' ? FC.orange : FC.mid,
						fontSize: 13,
						fontWeight: tone === 'danger' ? 700 : 500,
					}}
				>
					{actionLabel}
				</span>
			</button>
		</div>
	)
}

function ActionButton({
	label,
	onClick,
}: {
	label: string
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			style={{
				background: FC.blue,
				color: '#fff',
				border: 'none',
				borderRadius: 12,
				padding: '8px 14px',
				cursor: 'pointer',
				fontFamily: 'inherit',
				fontWeight: 600,
				fontSize: 13,
			}}
		>
			{label}
		</button>
	)
}
