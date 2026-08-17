import { useNavigate } from 'react-router-dom'
import { Download } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import {
	ProfileNavRow,
	ProfilePageShell,
	ProfileSectionCard,
} from '@/ui/figma/profile/profile-ui'
import { FC } from '@/ui/figma/v2/atoms'

export function FigmaProfileStorageScreen() {
	const navigate = useNavigate()

	return (
		<ProfilePageShell
			title="Storage & export"
			subtitle="Download and manage your Chronicle data"
			backLabel="You"
			onBack={() => navigate(ROUTES.profile)}
		>
			<ProfileSectionCard title="Export">
				<ProfileNavRow
					icon={Download}
					label="Export your data"
					subtitle="Download health records and documents"
					iconBg={FC.teal}
					onClick={() => navigate(ROUTES.profileSecurity)}
					isLast
				/>
			</ProfileSectionCard>
		</ProfilePageShell>
	)
}
