import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { HealthImportWizard } from '@/features/health-import/components/HealthImportWizard'
import { ImportCenter } from '@/features/health-import/components/ImportCenter'
import { ImportNotifications } from '@/features/health-import/components/ImportNotifications'

export function HealthImportWizardPage() {
	const navigate = useNavigate()
	const { user } = useAuth()

	if (!user?.id) {
		return null
	}

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.healthImport)}
				style={backButtonStyle}
			>
				<ArrowLeft size={18} />
				Back
			</button>

			<div
				style={{
					fontSize: 34,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 8,
				}}
			>
				Sync Health Reports
			</div>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 20,
					lineHeight: 1.5,
				}}
			>
				Import health reports from Google Drive into Chronicle.
			</div>

			<ImportNotifications />
			<HealthImportWizard userId={user.id} />
		</div>
	)
}

export function ImportCenterPage() {
	const navigate = useNavigate()
	const { user } = useAuth()

	if (!user?.id) {
		return null
	}

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.healthFolderSetup)}
				style={backButtonStyle}
			>
				<ArrowLeft size={18} />
				Back
			</button>

			<div
				style={{
					fontSize: 34,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 8,
				}}
			>
				Import Center
			</div>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 16,
					lineHeight: 1.5,
				}}
			>
				Track imports, retries, and document registry status.
			</div>

			<div
				style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}
			>
				<button
					type="button"
					onClick={() => navigate(ROUTES.healthImportReview)}
					style={{
						background: C.card2,
						border: `1px solid ${C.border}`,
						borderRadius: 100,
						padding: '10px 18px',
						fontSize: 13,
						fontWeight: 700,
						color: C.textSec,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					Review Reports
				</button>
				<button
					type="button"
					onClick={() => navigate(ROUTES.healthImportWizard)}
					style={{
						background: C.accent,
						border: 'none',
						borderRadius: 100,
						padding: '10px 18px',
						fontSize: 13,
						fontWeight: 700,
						color: C.white,
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					Sync Health Reports
				</button>
			</div>

			<ImportNotifications />
			<ImportCenter userId={user.id} />
		</div>
	)
}

const backButtonStyle = {
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
} as const
