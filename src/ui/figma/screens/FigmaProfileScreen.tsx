import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { HardDrive, Heart, Lock, Sliders, User, Users } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { FAMILY_ROLE_LABELS } from '@/features/family/constants/family-roles'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
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

	const displayName = profile?.name ?? user?.email?.split('@')[0] ?? 'You'
	const email = user?.email ?? ''
	const roleLabel = currentUserMember
		? FAMILY_ROLE_LABELS[currentUserMember.roleId]
		: 'Account Owner'

	const driveConnected = drive.connectionStatus === 'connected'
	const lastSync = drive.latestSync?.completedAt ?? drive.latestSync?.startedAt

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
					Profile
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
					label="Personal"
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
					label="Connected Accounts"
					subtitle={
						driveConnected
							? `Google Drive · synced ${formatLastSync(lastSync)}`
							: 'Connect Google Drive and more'
					}
					iconBg={FC.green}
					onClick={() => navigate(ROUTES.profileConnections)}
				/>
				<ProfileNavRow
					icon={Sliders}
					label="Preferences"
					subtitle="Default member, AI style, notifications"
					iconBg={FC.indigo}
					onClick={() => navigate(ROUTES.profilePreferences)}
					isLast
				/>
			</ProfileSectionCard>

			<ProfileSectionCard title="Privacy & Security">
				<ProfileNavRow
					icon={Lock}
					label="Security"
					subtitle="Authentication, data, sign out"
					iconBg={FC.amber}
					onClick={() => navigate(ROUTES.profileSecurity)}
					isLast
				/>
			</ProfileSectionCard>

			<ProfileSectionCard title="Modules">
				<ProfileNavRow
					icon={Heart}
					label="Health setup"
					subtitle="Import sources, folders, scan settings"
					iconBg={FC.red}
					onClick={() => navigate(ROUTES.healthSettings)}
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
