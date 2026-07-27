import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { resetAllImportedHealthData } from '@/features/health-import/services/health-data-cleanup.service'
import { queryClient } from '@/lib/query-client'
import { uploadedHealthReportsQueryKey } from '@/features/health/hooks/useUploadedHealthReports'
import { healthImportStatusQueryKey } from '@/features/health-import/services/health-import-status.service'
import { FigmaCard } from '@/ui/figma/components/primitives'
import {
	SettingsIntro,
	SettingsPageShell,
} from '@/ui/figma/settings/settings-ui'
import { HealthActionChip } from '@/ui/figma/health/health-ui'

export function SettingsDataPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id
	const [isResetting, setIsResetting] = useState(false)
	const [message, setMessage] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

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
		setError(null)
		setMessage(null)

		try {
			const result = await resetAllImportedHealthData(userId)

			void queryClient.invalidateQueries({
				queryKey: uploadedHealthReportsQueryKey(userId),
			})
			void queryClient.invalidateQueries({
				queryKey: healthImportStatusQueryKey(userId),
			})

			setMessage(
				`Removed ${result.reportsDeleted} report${result.reportsDeleted === 1 ? '' : 's'} and ${result.registryDeleted} registry row${result.registryDeleted === 1 ? '' : 's'}.`,
			)
		} catch (resetError) {
			setError(
				resetError instanceof Error ? resetError.message : 'Reset failed',
			)
		} finally {
			setIsResetting(false)
		}
	}

	return (
		<SettingsPageShell
			backLabel="Profile"
			onBack={() => navigate(ROUTES.profile)}
			title="Data & privacy"
		>
			<SettingsIntro>
				Manage imported health data stored in Chronicle. Removing a single
				health source (with confirmation) is available from Health Setup.
			</SettingsIntro>

			<FigmaCard style={{ padding: 16 }}>
				<div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
					Reset imported health data
				</div>
				<div
					style={{
						fontSize: 13,
						color: C.textSec,
						lineHeight: 1.5,
						marginBottom: 16,
					}}
				>
					Deletes all health reports, Google Drive registry entries, storage
					files, and knowledge graph data for your account. Does not remove
					folder assignments or Google Drive connection.
				</div>

				<HealthActionChip
					icon={Trash2}
					label={isResetting ? 'Resetting…' : 'Reset all imported health data'}
					onClick={() => void handleReset()}
					disabled={isResetting || !userId}
					destructive
				/>

				{message ? (
					<div style={{ fontSize: 13, color: C.greenAlt, marginTop: 12 }}>
						{message}
					</div>
				) : null}
				{error ? (
					<div style={{ fontSize: 13, color: C.red, marginTop: 12 }}>
						{error}
					</div>
				) : null}
			</FigmaCard>
		</SettingsPageShell>
	)
}
