import { useNavigate } from 'react-router-dom'
import {
	ArrowLeft,
	Cloud,
	Database,
	FolderOpen,
	LogOut,
	Shield,
	User,
	Wrench,
} from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { signOut } from '@/features/auth'
import { useAuth } from '@/features/auth'
import { useHealthImportStatus } from '@/features/health-import/hooks/useHealthImportStatus'
import { useUser } from '@/features/user/hooks/useUser'
import { getConnectorConnection } from '@/features/connectors/services/connector-store.service'
import { ConnectedServicesPanel } from '@/features/settings/components/ConnectedServicesPanel'
import { useEffect, useState } from 'react'

type ConnectionTone = 'connected' | 'partial' | 'disconnected'

const TONE_LABELS: Record<ConnectionTone, string> = {
	connected: 'Connected',
	partial: 'Needs attention',
	disconnected: 'Not connected',
}

const TONE_COLORS: Record<ConnectionTone, string> = {
	connected: C.greenAlt,
	partial: '#FFB020',
	disconnected: C.red,
}

function resolveConnectionTone(
	status: string | null | undefined,
	failedCount: number,
): ConnectionTone {
	if (status !== 'connected') return 'disconnected'
	if (failedCount > 0) return 'partial'
	return 'connected'
}

export function ProfilePage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { profile } = useUser()
	const userId = user?.id
	const importStatus = useHealthImportStatus(userId)
	const [connectionStatus, setConnectionStatus] = useState<string | null>(null)

	useEffect(() => {
		if (!userId) return
		void getConnectorConnection(userId, 'google-drive').then((connection) => {
			setConnectionStatus(
				(connection?.status as string | undefined) ?? 'disconnected',
			)
		})
	}, [userId])

	const tone = resolveConnectionTone(
		connectionStatus,
		importStatus.data?.failedImportsCount ?? 0,
	)

	return (
		<div style={{ padding: '18px 18px 24px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(-1)}
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 6,
					background: 'none',
					border: 'none',
					padding: 0,
					marginBottom: 18,
					cursor: 'pointer',
					color: C.textSec,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			>
				<ArrowLeft size={18} />
				Back
			</button>

			<div style={{ marginBottom: 22 }}>
				<div style={{ fontSize: 24, fontWeight: 800, color: C.text }}>
					{profile?.name ?? 'Account'}
				</div>
				{user?.email ? (
					<div style={{ fontSize: 14, color: C.textSec, marginTop: 4 }}>
						{user.email}
					</div>
				) : null}
				<div
					style={{
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						marginTop: 10,
						fontSize: 12,
						color: TONE_COLORS[tone],
					}}
				>
					<span
						style={{
							width: 8,
							height: 8,
							borderRadius: '50%',
							background: TONE_COLORS[tone],
						}}
					/>
					Google Drive · {TONE_LABELS[tone]}
				</div>
			</div>

			<SectionLabel>Health</SectionLabel>
			<MenuGroup
				items={[
					{
						icon: FolderOpen,
						label: 'Health Sources',
						hint: 'Folders & family assignments',
						onClick: () => navigate(ROUTES.healthSources),
					},
					{
						icon: Database,
						label: 'Import & Review',
						hint: 'Import center and pending reports',
						onClick: () => navigate(ROUTES.settingsImport),
					},
					{
						icon: Cloud,
						label: 'Google Drive connector',
						hint: 'Browse folders and sync settings',
						onClick: () => navigate(ROUTES.settingsConnectorsDrive),
					},
				]}
			/>

			<SectionLabel>Connected Services</SectionLabel>
			<div style={{ marginBottom: 14 }}>
				<ConnectedServicesPanel />
			</div>

			<SectionLabel>Account</SectionLabel>
			<MenuGroup
				items={[
					{
						icon: User,
						label: 'Account settings',
						onClick: () => navigate(ROUTES.settingsAccount),
					},
					{
						icon: Shield,
						label: 'Reset imported health data',
						destructive: true,
						onClick: () => navigate(ROUTES.settingsData),
					},
					{
						icon: LogOut,
						label: 'Sign out',
						destructive: true,
						onClick: () => void signOut(),
					},
				]}
			/>

			{import.meta.env.DEV ? (
				<>
					<SectionLabel>Developer</SectionLabel>
					<MenuGroup
						items={[
							{
								icon: Wrench,
								label: 'Discovery Dashboard',
								hint: 'Raw discovery stats and scan history',
								onClick: () => navigate(ROUTES.healthDiscovery),
							},
							{
								icon: Wrench,
								label: 'Validate Pipeline',
								hint: 'End-to-end health data validation',
								onClick: () => navigate(ROUTES.healthValidation),
							},
							{
								icon: Wrench,
								label: 'Import Debug',
								hint: 'Import queue and registry diagnostics',
								onClick: () => navigate(ROUTES.healthImportDebug),
							},
							{
								icon: Wrench,
								label: 'Connector debug',
								onClick: () => navigate(ROUTES.connectorsDebug),
							},
						]}
					/>
				</>
			) : null}
		</div>
	)
}

function SectionLabel({ children }: { children: string }) {
	return (
		<div
			style={{
				fontSize: 11,
				fontWeight: 600,
				letterSpacing: '0.09em',
				textTransform: 'uppercase',
				color: C.textMuted,
				marginBottom: 10,
				marginTop: 4,
			}}
		>
			{children}
		</div>
	)
}

function MenuGroup({
	items,
}: {
	items: Array<{
		icon: typeof User
		label: string
		hint?: string
		destructive?: boolean
		onClick: () => void
	}>
}) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 16,
				overflow: 'hidden',
				marginBottom: 14,
			}}
		>
			{items.map((item, index) => (
				<MenuRow
					key={item.label}
					{...item}
					isLast={index === items.length - 1}
				/>
			))}
		</div>
	)
}

function MenuRow({
	icon: Icon,
	label,
	hint,
	destructive = false,
	isLast = false,
	onClick,
}: {
	icon: typeof User
	label: string
	hint?: string
	destructive?: boolean
	isLast?: boolean
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
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
			<Icon size={18} color={destructive ? C.red : C.textSec} />
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
		</button>
	)
}
