import { Check, Cloud, FolderOpen, Trash2 } from 'lucide-react'
import { C } from '@/constants/colors'
import type { HealthSourceAssignment } from '@/features/family/types/family.types'

interface HealthFolderAssignmentCardProps {
	memberLabel: string
	folderName: string
	connectorLabel?: string
	assignedAt?: string
	lastScanAt?: string | null
	nextScheduledScanAt?: string | null
	documentsScanned?: number
	medicalReports?: number
	status?: 'configured' | 'not_configured' | 'scanning'
	onChange?: () => void
	onRemove?: () => void
	onSelectFolder?: () => void
}

export function HealthFolderAssignmentCard({
	memberLabel,
	folderName,
	connectorLabel = 'Google Drive',
	assignedAt,
	lastScanAt,
	nextScheduledScanAt,
	documentsScanned = 0,
	medicalReports = 0,
	status = 'configured',
	onChange,
	onRemove,
	onSelectFolder,
}: HealthFolderAssignmentCardProps) {
	const isScanning = status === 'scanning'
	const isConfigured = status === 'configured' || isScanning

	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'flex-start',
				gap: 12,
				padding: '12px 0',
			}}
		>
			<div
				style={{
					width: 36,
					height: 36,
					borderRadius: 11,
					background: isConfigured
						? 'rgba(108,111,255,0.12)'
						: 'rgba(255,255,255,0.06)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
				}}
			>
				{isConfigured ? (
					<FolderOpen size={18} color={C.accent} strokeWidth={1.7} />
				) : (
					<Cloud size={18} color={C.textMuted} strokeWidth={1.7} />
				)}
			</div>

			<div style={{ flex: 1, minWidth: 0 }}>
				<div
					style={{
						fontSize: 14,
						fontWeight: 700,
						color: C.text,
						marginBottom: 4,
					}}
				>
					{memberLabel}
				</div>

				{isConfigured ? (
					<>
						<div
							style={{
								fontSize: 13,
								color: C.textSec,
								overflow: 'hidden',
								textOverflow: 'ellipsis',
								whiteSpace: 'nowrap',
								marginBottom: 4,
							}}
						>
							📁 {folderName}
						</div>
						<div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.5 }}>
							<div>{connectorLabel}</div>
							{assignedAt ? (
								<div>
									Assigned{' '}
									{new Intl.DateTimeFormat(undefined, {
										dateStyle: 'medium',
									}).format(new Date(assignedAt))}
								</div>
							) : null}
							<div>
								Import candidates: {documentsScanned} · Medical reports:{' '}
								{medicalReports}
							</div>
							{lastScanAt ? (
								<div>
									Last scan{' '}
									{new Intl.DateTimeFormat(undefined, {
										dateStyle: 'medium',
										timeStyle: 'short',
									}).format(new Date(lastScanAt))}
								</div>
							) : (
								<div style={{ color: C.textMuted }}>Not scanned yet</div>
							)}
							{nextScheduledScanAt ? (
								<div>
									Next scan{' '}
									{new Intl.DateTimeFormat(undefined, {
										dateStyle: 'medium',
										timeStyle: 'short',
									}).format(new Date(nextScheduledScanAt))}
								</div>
							) : null}
							{isScanning ? (
								<div style={{ color: C.accent }}>Scanning…</div>
							) : (
								<div
									style={{
										color: C.greenAlt,
										display: 'flex',
										alignItems: 'center',
										gap: 4,
									}}
								>
									<Check size={11} />
									Configured
								</div>
							)}
						</div>
					</>
				) : (
					<div style={{ fontSize: 13, color: C.textMuted }}>Not Configured</div>
				)}
			</div>

			<div
				style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
			>
				{isConfigured ? (
					<>
						{onChange ? (
							<button
								type="button"
								onClick={onChange}
								style={{
									background: C.card2,
									border: `1px solid ${C.border}`,
									borderRadius: 100,
									padding: '8px 12px',
									fontSize: 11,
									fontWeight: 700,
									color: C.textSec,
									cursor: 'pointer',
									fontFamily: 'inherit',
								}}
							>
								Change
							</button>
						) : null}
						{onRemove ? (
							<button
								type="button"
								onClick={onRemove}
								style={{
									background: 'none',
									border: 'none',
									color: C.red,
									cursor: 'pointer',
									padding: 4,
								}}
								aria-label="Remove assignment"
							>
								<Trash2 size={16} />
							</button>
						) : null}
					</>
				) : onSelectFolder ? (
					<button
						type="button"
						onClick={onSelectFolder}
						style={{
							background: C.accentDim,
							border: '1px solid rgba(108,111,255,0.25)',
							borderRadius: 100,
							padding: '8px 12px',
							fontSize: 11,
							fontWeight: 700,
							color: C.accent,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Select Folder
					</button>
				) : null}
			</div>
		</div>
	)
}

export function assignmentCardFromAssignment(
	assignment: HealthSourceAssignment,
) {
	return {
		memberLabel: assignment.memberLabel,
		folderName: assignment.folderName,
		assignedAt: assignment.assignedAt,
	}
}
