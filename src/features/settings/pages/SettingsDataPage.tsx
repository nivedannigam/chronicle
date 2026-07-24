import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { C } from '@/constants/colors'
import { useAuth } from '@/features/auth'
import { resetAllImportedHealthData } from '@/features/health-import/services/health-data-cleanup.service'
import { queryClient } from '@/lib/query-client'
import { uploadedHealthReportsQueryKey } from '@/features/health/hooks/useUploadedHealthReports'
import { healthImportStatusQueryKey } from '@/features/health-import/services/health-import-status.service'

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
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
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
					marginBottom: 16,
					cursor: 'pointer',
					color: C.textSec,
					fontFamily: 'inherit',
					fontSize: 14,
				}}
			>
				<ArrowLeft size={18} />
				Back
			</button>

			<div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
				Data & privacy
			</div>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					lineHeight: 1.5,
					marginBottom: 20,
				}}
			>
				Manage imported health data stored in Chronicle. Removing a single
				health source (with confirmation) is available from Health Sources.
			</div>

			<div
				style={{
					background: C.card,
					border: `1px solid ${C.border}`,
					borderRadius: 16,
					padding: 16,
				}}
			>
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

				<button
					type="button"
					onClick={() => void handleReset()}
					disabled={isResetting || !userId}
					style={{
						background: 'rgba(255,69,58,0.12)',
						border: '1px solid rgba(255,69,58,0.35)',
						borderRadius: 100,
						padding: '12px 16px',
						fontSize: 13,
						fontWeight: 700,
						color: C.red,
						cursor: isResetting ? 'not-allowed' : 'pointer',
						fontFamily: 'inherit',
						display: 'inline-flex',
						alignItems: 'center',
						gap: 8,
					}}
				>
					{isResetting ? (
						<Loader2
							size={14}
							style={{ animation: 'spin 1s linear infinite' }}
						/>
					) : null}
					Reset all imported health data
				</button>

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
			</div>
		</div>
	)
}
