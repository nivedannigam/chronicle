import { useNavigate } from 'react-router-dom'
import { Cloud, Heart } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGoogleDriveConnector } from '@/features/connectors/google-drive/hooks/useGoogleDriveConnector'
import {
	ProfileNavRow,
	ProfilePageShell,
	ProfileSectionCard,
} from '@/ui/figma/profile/profile-ui'
import { FC } from '@/ui/figma/v2/atoms'

function formatLastSync(isoDate: string | null | undefined): string {
	if (!isoDate) return 'Never'

	const date = new Date(isoDate)
	if (Number.isNaN(date.getTime())) return 'Never'

	return date.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	})
}

export function FigmaProfileConnectionsScreen() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const drive = useGoogleDriveConnector(user?.id ?? '')

	const driveConnected = drive.connectionStatus === 'connected'
	const lastSync = drive.latestSync?.completedAt ?? drive.latestSync?.startedAt

	return (
		<ProfilePageShell
			title="Connected Accounts"
			subtitle="Services linked to your Chronicle account"
			backLabel="Profile"
			onBack={() => navigate(ROUTES.profile)}
		>
			<ProfileSectionCard title="Active">
				<ProfileNavRow
					icon={Cloud}
					label="Google Drive"
					subtitle={
						driveConnected
							? `${drive.googleEmail ?? 'Connected'} · Last sync ${formatLastSync(lastSync)}`
							: 'Connect to import health documents'
					}
					iconBg={FC.green}
					onClick={() => navigate(ROUTES.profileConnectionsDrive)}
				/>
				<ProfileNavRow
					icon={Heart}
					label="Health import"
					subtitle="Folder assignments and scan settings"
					iconBg={FC.red}
					onClick={() => navigate(ROUTES.healthSettings)}
					isLast
				/>
			</ProfileSectionCard>

			<p
				style={{
					color: FC.dim,
					fontSize: 12.5,
					lineHeight: 1.5,
					margin: 0,
					padding: '0 4px',
				}}
			>
				Google Calendar, email, and wearable integrations will appear here when
				available.
			</p>
		</ProfilePageShell>
	)
}
