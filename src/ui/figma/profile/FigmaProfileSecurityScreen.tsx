import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Shield, Trash2 } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { resetAllImportedHealthData } from '@/features/health-import/services/health-data-cleanup.service'
import { uploadedHealthReportsQueryKey } from '@/features/health/hooks/useUploadedHealthReports'
import { healthImportStatusQueryKey } from '@/features/health-import/services/health-import-status.service'
import { queryClient } from '@/lib/query-client'
import {
	ProfileNavRow,
	ProfilePageShell,
	ProfileSectionCard,
} from '@/ui/figma/profile/profile-ui'
import { FC } from '@/ui/figma/v2/atoms'

export function FigmaProfileSecurityScreen() {
	const navigate = useNavigate()
	const { user, signOut } = useAuth()
	const userId = user?.id
	const [isResetting, setIsResetting] = useState(false)
	const [resetMessage, setResetMessage] = useState<string | null>(null)
	const [resetError, setResetError] = useState<string | null>(null)
	const [isSigningOut, setIsSigningOut] = useState(false)

	const handleReset = async () => {
		if (!userId) {
			return
		}

		const confirmed = window.confirm(
			'Reset ALL imported health data for your account?\n\nThis permanently deletes health reports, registry entries, storage files, and knowledge graph data. Folder assignments are kept.\n\nThis cannot be undone.',
		)

		if (!confirmed) {
			return
		}

		setIsResetting(true)
		setResetError(null)
		setResetMessage(null)

		try {
			const result = await resetAllImportedHealthData(userId)

			void queryClient.invalidateQueries({
				queryKey: uploadedHealthReportsQueryKey(userId),
			})
			void queryClient.invalidateQueries({
				queryKey: healthImportStatusQueryKey(userId),
			})

			setResetMessage(
				`Removed ${result.reportsDeleted} report${result.reportsDeleted === 1 ? '' : 's'} and ${result.registryDeleted} registry row${result.registryDeleted === 1 ? '' : 's'}.`,
			)
		} catch (error) {
			setResetError(error instanceof Error ? error.message : 'Reset failed')
		} finally {
			setIsResetting(false)
		}
	}

	const handleSignOut = async () => {
		setIsSigningOut(true)
		try {
			await signOut()
			navigate(ROUTES.login)
		} finally {
			setIsSigningOut(false)
		}
	}

	return (
		<ProfilePageShell
			title="Security"
			subtitle="Authentication, privacy, and account control"
			backLabel="Profile"
			onBack={() => navigate(ROUTES.profile)}
		>
			<ProfileSectionCard title="Authentication">
				<ProfileNavRow
					icon={Shield}
					label="Signed in with Google"
					subtitle={user?.email ?? 'Unknown account'}
					iconBg={FC.green}
					isLast
				/>
			</ProfileSectionCard>

			<ProfileSectionCard title="Data & privacy">
				<div style={{ padding: '14px 18px' }}>
					<p
						style={{
							color: FC.mid,
							fontSize: 13,
							lineHeight: 1.5,
							margin: '0 0 14px',
						}}
					>
						Manage imported health data stored in Chronicle. Per-source removal
						is available from Health setup.
					</p>
					<button
						type="button"
						onClick={() => void handleReset()}
						disabled={isResetting || !userId}
						style={{
							display: 'inline-flex',
							alignItems: 'center',
							gap: 8,
							background: 'rgba(239,68,68,0.12)',
							border: '1px solid rgba(239,68,68,0.25)',
							borderRadius: 100,
							padding: '11px 16px',
							fontSize: 13,
							fontWeight: 700,
							color: FC.red,
							cursor: isResetting ? 'not-allowed' : 'pointer',
							opacity: isResetting ? 0.6 : 1,
							fontFamily: 'inherit',
							minHeight: 44,
						}}
					>
						<Trash2 size={15} />
						{isResetting ? 'Resetting…' : 'Reset imported health data'}
					</button>
					{resetMessage ? (
						<p style={{ color: FC.green, fontSize: 13, margin: '12px 0 0' }}>
							{resetMessage}
						</p>
					) : null}
					{resetError ? (
						<p style={{ color: FC.red, fontSize: 13, margin: '12px 0 0' }}>
							{resetError}
						</p>
					) : null}
				</div>
			</ProfileSectionCard>

			<ProfileSectionCard title="Session">
				<button
					type="button"
					onClick={() => void handleSignOut()}
					disabled={isSigningOut}
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 13,
						padding: '14px 18px',
						cursor: isSigningOut ? 'not-allowed' : 'pointer',
						width: '100%',
						background: 'none',
						border: 'none',
						fontFamily: 'inherit',
						textAlign: 'left',
						minHeight: 56,
						opacity: isSigningOut ? 0.6 : 1,
					}}
				>
					<div
						style={{
							width: 36,
							height: 36,
							borderRadius: 10,
							flexShrink: 0,
							background: FC.amber,
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<LogOut size={17} color="#fff" strokeWidth={2} />
					</div>
					<div style={{ flex: 1 }}>
						<p
							style={{
								color: FC.fg,
								fontSize: 15,
								fontWeight: 600,
								margin: 0,
							}}
						>
							{isSigningOut ? 'Signing out…' : 'Sign out'}
						</p>
						<p
							style={{
								color: FC.dim,
								fontSize: 12.5,
								margin: '3px 0 0',
							}}
						>
							End session on this device
						</p>
					</div>
				</button>
			</ProfileSectionCard>

			<p
				style={{
					color: FC.dim,
					fontSize: 12,
					lineHeight: 1.5,
					margin: '8px 4px 0',
					textAlign: 'center',
				}}
			>
				Passkeys and multi-device session management coming soon.
			</p>
		</ProfilePageShell>
	)
}
