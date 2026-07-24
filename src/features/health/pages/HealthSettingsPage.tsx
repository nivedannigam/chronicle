import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cloud, Loader2, RefreshCw, Shield } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { HealthFolderAssignmentCard } from '@/features/family/components/HealthFolderAssignmentCard'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { useHealthSources } from '@/features/family/hooks/useHealthSources'
import { ImportJourneyStep } from '@/features/health-import/components/ImportJourneyStep'
import { useHealthImportStatus } from '@/features/health-import/hooks/useHealthImportStatus'
import { runHealthImportJourney } from '@/features/health-import/services/health-import-journey.service'
import type {
	ImportJourneyPhase,
	ImportJourneyResult,
} from '@/features/health-import/types/health-import-journey.types'
import { useHealthMemberSetup } from '@/features/health/hooks/useHealthMemberSetup'

export function HealthSettingsPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMember, selectedMemberId } = useFamilyContext()
	const setup = useHealthMemberSetup()
	const { assignments, isLoading, refresh } = useHealthSources(userId)
	const importStatus = useHealthImportStatus(userId)

	const [isScanning, setIsScanning] = useState(false)
	const [journeyPhase, setJourneyPhase] =
		useState<ImportJourneyPhase>('scanning')
	const [journeyPhasesCompleted, setJourneyPhasesCompleted] = useState<
		ImportJourneyPhase[]
	>(['assign'])
	const [journeyPhasesSucceeded, setJourneyPhasesSucceeded] = useState<
		ImportJourneyPhase[]
	>(['assign'])
	const [journeyResult, setJourneyResult] =
		useState<ImportJourneyResult | null>(null)
	const [journeyError, setJourneyError] = useState<string | null>(null)

	if (!userId || !selectedMember) {
		return null
	}

	const memberLabel = formatMemberLabel(selectedMember)
	const memberAssignments = assignments.filter(
		(assignment) => assignment.familyMemberId === selectedMemberId,
	)
	const folderIds = [
		...new Set(
			memberAssignments.map((assignment) => assignment.externalFolderId),
		),
	]
	const status = importStatus.data

	const handleScanNow = async () => {
		if (folderIds.length === 0) {
			return
		}

		setIsScanning(true)
		setJourneyResult(null)
		setJourneyError(null)
		setJourneyPhase('scanning')
		setJourneyPhasesCompleted(['assign'])
		setJourneyPhasesSucceeded(['assign'])

		try {
			const result = await runHealthImportJourney(
				userId,
				folderIds,
				({ phase, phasesCompleted, phasesSucceeded }) => {
					setJourneyPhase(phase)
					setJourneyPhasesCompleted(phasesCompleted)
					setJourneyPhasesSucceeded(phasesSucceeded)
				},
			)

			setJourneyResult(result)
			setJourneyPhase('summary')
			setJourneyError(
				result.outcome === 'failed' || result.outcome === 'partial_success'
					? (result.primaryError ?? result.errorMessage)
					: null,
			)

			await Promise.all([refresh(), setup.refetch(), importStatus.refetch()])
		} catch (scanError) {
			setJourneyError(
				scanError instanceof Error
					? scanError.message
					: 'Scan failed. Please try again.',
			)
		} finally {
			setIsScanning(false)
		}
	}

	return (
		<div>
			<Section title="Connected Drive">
				<SettingRow
					icon={Cloud}
					label="Google Drive"
					value={setup.driveConnected ? 'Connected' : 'Not connected'}
					tone={setup.driveConnected ? 'success' : 'muted'}
					actionLabel={setup.driveConnected ? 'Manage' : 'Connect'}
					onAction={() => navigate(ROUTES.settingsConnectorsDrive)}
				/>
			</Section>

			<Section title="Assigned Folder">
				<div
					style={{
						fontSize: 13,
						color: C.textMuted,
						marginBottom: 14,
						lineHeight: 1.5,
					}}
				>
					Medical PDFs in assigned folders are scanned for{' '}
					<strong style={{ color: C.text }}>{memberLabel}</strong>.
				</div>

				{isLoading ? (
					<div style={{ fontSize: 13, color: C.textMuted }}>Loading…</div>
				) : memberAssignments.length === 0 ? (
					<HealthFolderAssignmentCard
						memberLabel={memberLabel}
						folderName=""
						status="not_configured"
						onSelectFolder={() => navigate(ROUTES.settingsConnectorsDrive)}
					/>
				) : (
					memberAssignments.map((assignment) => {
						const folderStatus = status?.folders.find(
							(folder) => folder.assignmentId === assignment.id,
						)

						return (
							<HealthFolderAssignmentCard
								key={assignment.id}
								memberLabel={memberLabel}
								folderName={assignment.folderName}
								assignedAt={assignment.assignedAt}
								status={isScanning ? 'scanning' : 'configured'}
								documentsScanned={folderStatus?.documentsScanned ?? 0}
								medicalReports={folderStatus?.medicalReports ?? 0}
								lastScanAt={folderStatus?.lastScanAt ?? null}
								onChange={() => navigate(ROUTES.settingsConnectorsDrive)}
							/>
						)
					})
				)}
			</Section>

			<Section title="Import Behaviour">
				<SettingRow
					icon={RefreshCw}
					label="Scan for new reports"
					value={
						folderIds.length > 0
							? `${folderIds.length} folder${folderIds.length === 1 ? '' : 's'} ready`
							: 'Assign a folder first'
					}
					actionLabel={isScanning ? 'Scanning…' : 'Scan now'}
					onAction={() => void handleScanNow()}
					disabled={isScanning || folderIds.length === 0}
				/>

				{setup.needsReview > 0 ? (
					<button
						type="button"
						onClick={() => navigate(ROUTES.healthImportReview)}
						style={{
							width: '100%',
							marginTop: 10,
							background: `${C.orange}18`,
							border: `1px solid ${C.orange}44`,
							borderRadius: 14,
							padding: '12px 16px',
							fontSize: 14,
							fontWeight: 600,
							color: C.orange,
							cursor: 'pointer',
							fontFamily: 'inherit',
							textAlign: 'left',
						}}
					>
						Review {setup.needsReview} pending report
						{setup.needsReview === 1 ? '' : 's'}
					</button>
				) : null}

				{journeyResult || journeyError || isScanning ? (
					<div style={{ marginTop: 14 }}>
						<ImportJourneyStep
							successInfo={{
								memberLabels: [memberLabel],
								folderName:
									memberAssignments[0]?.folderName ?? 'Assigned folders',
								externalFolderId: folderIds[0] ?? '',
							}}
							phase={journeyPhase}
							phasesCompleted={journeyPhasesCompleted}
							phasesSucceeded={journeyPhasesSucceeded}
							result={journeyResult}
							isRunning={isScanning}
							errorMessage={journeyError}
							onRetry={() => void handleScanNow()}
							onChooseDifferentFolder={() =>
								navigate(ROUTES.settingsConnectorsDrive)
							}
							onClose={() => {
								setJourneyResult(null)
								setJourneyError(null)
							}}
						/>
					</div>
				) : null}
			</Section>

			<Section title="Extraction Preferences">
				<div
					style={{
						padding: '14px 16px',
						borderRadius: 14,
						border: `1px solid ${C.border}`,
						background: C.card,
						fontSize: 13,
						color: C.textSec,
						lineHeight: 1.55,
					}}
				>
					Chronicle automatically runs OCR and extracts structured metrics from
					imported PDFs. Open any report to reprocess if extraction needs a
					refresh.
				</div>
			</Section>

			<Section title="Privacy">
				<SettingRow
					icon={Shield}
					label="Health data"
					value="Stored securely in your account"
					actionLabel="Manage data"
					onAction={() => navigate(ROUTES.settingsData)}
				/>
			</Section>
		</div>
	)
}

function Section({
	title,
	children,
}: {
	title: string
	children: React.ReactNode
}) {
	return (
		<section style={{ marginBottom: 28 }}>
			<div
				style={{
					fontSize: 11,
					fontWeight: 600,
					letterSpacing: '0.09em',
					textTransform: 'uppercase',
					color: C.textMuted,
					marginBottom: 12,
				}}
			>
				{title}
			</div>
			{children}
		</section>
	)
}

function SettingRow({
	icon: Icon,
	label,
	value,
	actionLabel,
	onAction,
	disabled = false,
	tone = 'muted',
}: {
	icon: typeof Cloud
	label: string
	value: string
	actionLabel: string
	onAction: () => void
	disabled?: boolean
	tone?: 'success' | 'muted'
}) {
	return (
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 12,
				padding: '14px 16px',
				borderRadius: 14,
				border: `1px solid ${C.border}`,
				background: C.card,
			}}
		>
			<div
				style={{
					width: 40,
					height: 40,
					borderRadius: 12,
					background: C.card2,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<Icon size={18} color={tone === 'success' ? C.greenAlt : C.textSec} />
			</div>
			<div style={{ flex: 1 }}>
				<div style={{ fontSize: 14, fontWeight: 700 }}>{label}</div>
				<div
					style={{
						fontSize: 12,
						color: tone === 'success' ? C.greenAlt : C.textMuted,
					}}
				>
					{value}
				</div>
			</div>
			<button
				type="button"
				onClick={onAction}
				disabled={disabled}
				style={{
					background: C.accentDim,
					border: 'none',
					borderRadius: 100,
					padding: '8px 12px',
					fontSize: 12,
					fontWeight: 700,
					color: C.accent,
					cursor: disabled ? 'not-allowed' : 'pointer',
					fontFamily: 'inherit',
					opacity: disabled ? 0.6 : 1,
					display: 'inline-flex',
					alignItems: 'center',
					gap: 6,
				}}
			>
				{disabled && actionLabel.includes('…') ? (
					<Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
				) : null}
				{actionLabel}
			</button>
		</div>
	)
}
