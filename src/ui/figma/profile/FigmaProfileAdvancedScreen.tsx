import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bug, FolderSync, RefreshCw, Trash2 } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import {
	formatPlatformIntegrityAuditReport,
	runPlatformIntegrityAudit,
} from '@/core/platform'
import {
	ProfileNavRow,
	ProfilePageShell,
	ProfileSectionCard,
} from '@/ui/figma/profile/profile-ui'
import { FC, figmaCardStyle } from '@/ui/figma/v2/atoms'

export function FigmaProfileAdvancedScreen() {
	const navigate = useNavigate()
	const isDev = import.meta.env.DEV
	const { user } = useAuth()
	const documentsQuery = useMemberDocuments()
	const [auditReport, setAuditReport] = useState<string | null>(null)

	const documents = useMemo(
		() => documentsQuery.data ?? [],
		[documentsQuery.data],
	)

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
					/>
					<button
						type="button"
						onClick={() => {
							const result = runPlatformIntegrityAudit({
								documents,
								userId: user?.id,
								selectedMemberId: null,
							})
							setAuditReport(formatPlatformIntegrityAuditReport(result))
						}}
						style={{
							width: '100%',
							...figmaCardStyle,
							borderRadius: 16,
							padding: '14px 16px',
							color: FC.fg,
							fontSize: 14,
							fontWeight: 600,
							cursor: 'pointer',
							fontFamily: 'inherit',
							marginBottom: auditReport ? 12 : 0,
						}}
					>
						Run platform integrity audit
					</button>
					{auditReport ? (
						<pre
							style={{
								...figmaCardStyle,
								borderRadius: 16,
								padding: '14px 16px',
								color: FC.dim,
								fontSize: 11,
								whiteSpace: 'pre-wrap',
								margin: 0,
								maxHeight: 280,
								overflow: 'auto',
							}}
						>
							{auditReport}
						</pre>
					) : null}
				</ProfileSectionCard>
			) : null}

			<p style={{ color: FC.dim, fontSize: 12.5, lineHeight: 1.5, margin: 0 }}>
				These tools are for troubleshooting. Most people never need them.
			</p>
		</ProfilePageShell>
	)
}
