import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	Bell,
	Download,
	HardDrive,
	Lock,
	Palette,
	Settings2,
	Sliders,
	User,
	Users,
} from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { readChronicleSetupState } from '@/features/setup/services/chronicle-setup.service'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { FAMILY_ROLE_LABELS } from '@/features/family/constants/family-roles'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useHealthSources } from '@/features/family/hooks/useHealthSources'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { useInsuranceSources } from '@/features/insurance/hooks/useInsuranceSources'
import { useVehicleSources } from '@/features/vehicles/hooks/useVehicleSources'
import { useUser } from '@/features/user/hooks/useUser'
import {
	ProfileAvatar,
	ProfileConnectionChip,
	ProfileNavRow,
	ProfilePageShell,
	ProfileSectionCard,
	ProfileStatTile,
} from '@/ui/figma/profile/profile-ui'
import { FC } from '@/ui/figma/v2/atoms'

function formatMemberSince(isoDate: string | undefined): string {
	if (!isoDate) return 'Recently joined'

	const date = new Date(isoDate)
	if (Number.isNaN(date.getTime())) return 'Recently joined'

	return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatLastSync(isoDate: string | null | undefined): string {
	if (!isoDate) return 'Never'

	const date = new Date(isoDate)
	if (Number.isNaN(date.getTime())) return 'Never'

	const diffMs = Date.now() - date.getTime()
	const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

	if (diffHours < 1) return 'Just now'
	if (diffHours < 24) return `${diffHours}h ago`

	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function FigmaProfileScreen() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { profile } = useUser()
	const { members, currentUserMember } = useFamilyContext()
	const { allReports } = useMemberHealthReports()
	const { data: documents = [] } = useMemberDocuments()
	const drive = useGoogleDriveConnector(user?.id ?? '')
	const { assignments: healthAssignments } = useHealthSources(user?.id)
	const { assignments: insuranceAssignments } = useInsuranceSources(user?.id)
	const { moduleAssignments: vehicleAssignments } = useVehicleSources(user?.id)

	const displayName = profile?.name ?? user?.email?.split('@')[0] ?? 'You'
	const email = user?.email ?? ''
	const roleLabel = currentUserMember
		? FAMILY_ROLE_LABELS[currentUserMember.roleId]
		: 'Account Owner'

	const driveConnected = drive.connectionStatus === 'connected'
	const setupState = readChronicleSetupState()
	const rootFolderLabel =
		setupState.rootFolder?.folderPath ?? setupState.rootFolder?.folderName

	const registryLastSync = drive.registry.reduce<string | null>(
		(latest, record) => {
			const candidate = record.lastSyncAt ?? record.importedAt

			if (!candidate) {
				return latest
			}

			if (!latest) {
				return candidate
			}

			return new Date(candidate).getTime() > new Date(latest).getTime()
				? candidate
				: latest
		},
		null,
	)
	const lastSync =
		drive.latestSync?.completedAt ??
		drive.latestSync?.startedAt ??
		registryLastSync

	const hasModuleAssignments = useMemo(
		() =>
			healthAssignments.length > 0 ||
			insuranceAssignments.length > 0 ||
			vehicleAssignments.length > 0,
		[
			healthAssignments.length,
			insuranceAssignments.length,
			vehicleAssignments.length,
		],
	)

	const stats = useMemo(
		() => [
			{
				value: String(allReports.length),
				label: 'Health Reports',
				accent: FC.green,
				path: ROUTES.health,
			},
			{
				value: String(documents.length),
				label: 'Documents',
				accent: FC.purple,
				path: ROUTES.documents,
			},
			{
				value: String(Math.max(members.length, 1)),
				label: 'Family Members',
				accent: FC.pink,
				path: ROUTES.profileFamily,
			},
			{
				value: formatLastSync(lastSync),
				label: 'Last Sync',
				accent: FC.blue,
				path: ROUTES.profileConnectionsDrive,
			},
		],
		[allReports.length, documents.length, lastSync, members.length],
	)

	return (
		<ProfilePageShell padding="0 22px 24px">
			<div style={{ padding: '4px 0 8px' }}>
				<h1
					style={{
						color: FC.fg,
						fontSize: 34,
						fontWeight: 700,
						letterSpacing: -1.6,
						margin: 0,
					}}
				>
					You
				</h1>
			</div>
			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					textAlign: 'center',
					padding: '12px 0 24px',
					gap: 10,
				}}
			>
				<ProfileAvatar
					name={displayName}
					avatarUrl={profile?.avatarUrl}
					size={96}
				/>
				<div>
					<h1
						style={{
							color: FC.fg,
							fontSize: 26,
							fontWeight: 700,
							letterSpacing: -0.8,
							margin: '0 0 6px',
						}}
					>
						{displayName}
					</h1>
					<p style={{ color: FC.mid, fontSize: 14, margin: '0 0 8px' }}>
						{email}
					</p>
					<div
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 8,
							flexWrap: 'wrap',
							justifyContent: 'center',
						}}
					>
						<span
							style={{
								background: 'rgba(59,130,246,0.12)',
								border: '1px solid rgba(59,130,246,0.24)',
								borderRadius: 20,
								padding: '4px 12px',
								color: FC.blue,
								fontSize: 12,
								fontWeight: 600,
							}}
						>
							{roleLabel}
						</span>
						<span style={{ color: FC.dim, fontSize: 12 }}>
							Member since {formatMemberSince(user?.created_at)}
						</span>
					</div>
				</div>

				<div
					style={{
						display: 'flex',
						flexWrap: 'wrap',
						gap: 8,
						justifyContent: 'center',
						marginTop: 6,
					}}
				>
					<ProfileConnectionChip
						label="Google"
						status="Signed in"
						color={FC.green}
					/>
					<ProfileConnectionChip
						label="Google Drive"
						status={driveConnected ? 'Connected' : 'Not connected'}
						color={driveConnected ? FC.green : FC.amber}
					/>
				</div>
			</div>

			{!driveConnected || !hasModuleAssignments ? (
				<div style={{ marginBottom: 18 }}>
					<button
						type="button"
						onClick={() => navigate(ROUTES.setup)}
						style={{
							width: '100%',
							borderRadius: 18,
							border: `1px solid ${FC.blue}35`,
							background: `${FC.blue}12`,
							padding: '14px 16px',
							cursor: 'pointer',
							fontFamily: 'inherit',
							textAlign: 'left',
						}}
					>
						<p
							style={{
								color: FC.fg,
								fontSize: 14,
								fontWeight: 700,
								margin: '0 0 4px',
							}}
						>
							{driveConnected
								? 'Finish connecting your folders'
								: 'Connect Chronicle to your documents'}
						</p>
						<p style={{ color: FC.dim, fontSize: 12.5, margin: 0 }}>
							{rootFolderLabel
								? `Chronicle folder: ${rootFolderLabel}`
								: 'A quick setup journey gets Chronicle ready.'}
						</p>
					</button>
				</div>
			) : null}

			<div
				style={{
					display: 'grid',
					gridTemplateColumns: '1fr 1fr',
					gap: 10,
					marginBottom: 22,
				}}
			>
				{stats.map((stat) => (
					<ProfileStatTile
						key={stat.label}
						value={stat.value}
						label={stat.label}
						accent={stat.accent}
						onClick={() => navigate(stat.path)}
					/>
				))}
			</div>

			<ProfileSectionCard title="Account">
				<ProfileNavRow
					icon={User}
					label="Profile"
					subtitle="Name, email, language, timezone"
					iconBg={FC.blue}
					onClick={() => navigate(ROUTES.profilePersonal)}
				/>
				<ProfileNavRow
					icon={Users}
					label="Family"
					subtitle={`${members.length} member${members.length === 1 ? '' : 's'} · permissions & sharing`}
					iconBg={FC.purple}
					onClick={() => navigate(ROUTES.profileFamily)}
				/>
				<ProfileNavRow
					icon={HardDrive}
					label="Connected services"
					subtitle={
						driveConnected
							? `Google Drive · ${rootFolderLabel ?? 'Connected'}`
							: 'Connect Google Drive'
					}
					iconBg={FC.green}
					onClick={() => navigate(ROUTES.profileConnections)}
				/>
				<ProfileNavRow
					icon={Lock}
					label="Privacy"
					subtitle="Authentication, data, sign out"
					iconBg={FC.amber}
					onClick={() => navigate(ROUTES.profileSecurity)}
				/>
				<ProfileNavRow
					icon={Bell}
					label="Notifications"
					subtitle="Reminders and alerts"
					iconBg={FC.orange}
					onClick={() => navigate(ROUTES.settingsNotifications)}
				/>
				<ProfileNavRow
					icon={Palette}
					label="Appearance"
					subtitle="Theme and display"
					iconBg={FC.indigo}
					onClick={() => navigate(ROUTES.settingsAppearance)}
				/>
				<ProfileNavRow
					icon={Download}
					label="Storage & export"
					subtitle="Download and manage your data"
					iconBg={FC.teal}
					onClick={() => navigate(ROUTES.profileStorage)}
				/>
				<ProfileNavRow
					icon={Settings2}
					label="Advanced"
					subtitle="Diagnostics and troubleshooting"
					iconBg={FC.mid}
					onClick={() => navigate(ROUTES.profileAdvanced)}
					isLast
				/>
			</ProfileSectionCard>

			<ProfileSectionCard title="Preferences">
				<ProfileNavRow
					icon={Sliders}
					label="Preferences"
					subtitle="Default member, AI style, display format"
					iconBg={FC.indigo}
					onClick={() => navigate(ROUTES.profilePreferences)}
					isLast
				/>
			</ProfileSectionCard>

			<p
				style={{
					color: 'rgba(255,255,255,0.15)',
					fontSize: 11.5,
					textAlign: 'center',
					marginTop: 8,
				}}
			>
				Chronicle · Family OS
			</p>
		</ProfilePageShell>
	)
}
