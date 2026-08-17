import { useNavigate } from 'react-router-dom'
import { Bug, FolderSync, RefreshCw, Trash2 } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import {
	ProfileNavRow,
	ProfilePageShell,
	ProfileSectionCard,
} from '@/ui/figma/profile/profile-ui'
import { FC } from '@/ui/figma/v2/atoms'

export function FigmaProfileAdvancedScreen() {
	const navigate = useNavigate()
	const isDev = import.meta.env.DEV

	return (
		<ProfilePageShell
			title="Advanced"
			subtitle="Technical tools and diagnostics"
			backLabel="You"
			onBack={() => navigate(ROUTES.profile)}
		>
			<ProfileSectionCard title="Documents">
				<ProfileNavRow
					icon={FolderSync}
					label="Review documents"
					subtitle="Documents that need your attention"
					iconBg={FC.amber}
					onClick={() => navigate(ROUTES.reviewDocuments)}
				/>
				<ProfileNavRow
					icon={RefreshCw}
					label="Import diagnostics"
					subtitle="See what Chronicle found in your folders"
					iconBg={FC.blue}
					onClick={() => navigate(ROUTES.reviewDocuments)}
					isLast
				/>
			</ProfileSectionCard>

			<ProfileSectionCard title="Data">
				<ProfileNavRow
					icon={Trash2}
					label="Reset imported health data"
					subtitle="Remove imported health records from Chronicle"
					iconBg={FC.orange}
					onClick={() => navigate(ROUTES.profileSecurity)}
					isLast
				/>
			</ProfileSectionCard>

			{isDev ? (
				<ProfileSectionCard title="Developer">
					<ProfileNavRow
						icon={Bug}
						label="Connector diagnostics"
						subtitle="Debug Google Drive connector state"
						iconBg={FC.purple}
						onClick={() => navigate(ROUTES.connectorsDebug)}
						isLast
					/>
				</ProfileSectionCard>
			) : null}

			<p style={{ color: FC.dim, fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
				These tools are for troubleshooting. Most people never need them.
			</p>
		</ProfilePageShell>
	)
}
