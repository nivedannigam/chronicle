import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Cloud, FolderOpen, Loader2 } from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth'
import { HealthFolderAssignmentCard } from '@/features/family/components/HealthFolderAssignmentCard'
import { useFamilyMembers } from '@/features/family/hooks/useFamilyMembers'
import { useHealthSources } from '@/features/family/hooks/useHealthSources'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { dedupeFamilyMembersByLabel } from '@/features/family/utils/dedupe-family-members'
import { ImportJourneyStep } from '@/features/health-import/components/ImportJourneyStep'
import { useHealthImportStatus } from '@/features/health-import/hooks/useHealthImportStatus'
import { runHealthImportJourney } from '@/features/health-import/services/health-import-journey.service'
import { resetFailedImportCandidates } from '@/features/medical-discovery/services/import-pipeline.service'
import type {
	ImportJourneyPhase,
	ImportJourneyResult,
} from '@/features/health-import/types/health-import-journey.types'
import { useUser } from '@/features/user/hooks/useUser'
import { useState } from 'react'

export function HealthSourcesPage() {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { profile } = useUser()
	const userId = user?.id
	const { members } = useFamilyMembers(userId, profile?.name ?? 'Me')
	const { assignments, isLoading, error, removeAssignment, refresh } =
		useHealthSources(userId)
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

	if (!userId) {
		return null
	}

	const configuredMemberIds = new Set(
		assignments.map((assignment) => assignment.familyMemberId),
	)
	const uniqueMembers = dedupeFamilyMembersByLabel(members, configuredMemberIds)
	const hasAnyAssignments = assignments.length > 0
	const status = importStatus.data
	const showJourneySummary = journeyResult !== null

	const handleRemoveAssignment = async (
		assignmentId: string,
		folderName: string,
	) => {
		const confirmed = window.confirm(
			`Remove source and delete imported reports for "${folderName}"?\n\nThis permanently deletes registry entries, health reports, storage files, and invalidates the knowledge graph for data from this folder.\n\nThis cannot be undone.`,
		)

		if (!confirmed) {
			return
		}

		await removeAssignment(assignmentId, { deleteImportedData: true })
		await importStatus.refetch()
	}

	const handleScanNow = async () => {
		const folderIds = [
			...new Set(assignments.map((assignment) => assignment.externalFolderId)),
		]

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
			await resetFailedImportCandidates(userId)

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
			setJourneyPhasesCompleted(result.phasesCompleted)
			setJourneyPhasesSucceeded(result.phasesSucceeded)

			setJourneyError(
				result.outcome === 'failed' || result.outcome === 'partial_success'
					? (result.primaryError ?? result.errorMessage)
					: null,
			)

			await refresh()
			await importStatus.refetch()
		} catch (scanError) {
			setJourneyError(
				scanError instanceof Error ? scanError.message : 'Scan failed',
			)
		} finally {
			setIsScanning(false)
		}
	}

	return (
		<div style={{ padding: '18px 18px 20px', color: C.text }}>
			<button
				type="button"
				onClick={() => navigate(ROUTES.modules)}
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

			<div
				style={{
					fontSize: 34,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 8,
				}}
			>
				Health Sources
			</div>
			<div
				style={{
					fontSize: 14,
					color: C.textSec,
					marginBottom: 22,
					lineHeight: 1.5,
				}}
			>
				Configure Google Drive folders for each family member. Scan manually
				from here or Health Sources when you want to import new reports.
			</div>

			{hasAnyAssignments ? (
				<button
					type="button"
					onClick={() => void handleScanNow()}
					disabled={isScanning}
					style={{
						background: C.accent,
						border: 'none',
						borderRadius: 100,
						padding: '10px 14px',
						fontSize: 12,
						fontWeight: 700,
						color: C.white,
						cursor: isScanning ? 'not-allowed' : 'pointer',
						fontFamily: 'inherit',
						opacity: isScanning ? 0.6 : 1,
						display: 'inline-flex',
						alignItems: 'center',
						gap: 6,
						marginBottom: 16,
					}}
				>
					{isScanning ? (
						<Loader2
							size={14}
							style={{ animation: 'spin 1s linear infinite' }}
						/>
					) : null}
					Scan & Import Now
				</button>
			) : null}

			{showJourneySummary && journeyResult ? (
				<div
					style={{
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 18,
						padding: 16,
						marginBottom: 16,
					}}
				>
					<ImportJourneyStep
						successInfo={{
							memberLabels: uniqueMembers.map((member) =>
								formatMemberLabel(member),
							),
							folderName: 'All assigned folders',
							externalFolderId: '',
						}}
						phase={journeyPhase}
						phasesCompleted={journeyPhasesCompleted}
						phasesSucceeded={journeyPhasesSucceeded}
						result={journeyResult}
						isRunning={isScanning}
						errorMessage={journeyError}
						onRetry={() => void handleScanNow()}
						onChooseDifferentFolder={() => navigate(ROUTES.healthFolderSetup)}
						onClose={() => setJourneyResult(null)}
					/>
				</div>
			) : null}

			{status && hasAnyAssignments && !showJourneySummary ? (
				<div
					style={{
						display: 'grid',
						gridTemplateColumns: '1fr 1fr',
						gap: 8,
						marginBottom: 16,
					}}
				>
					<MiniStat
						label="Import candidates"
						value={status.importCandidatesCount}
					/>
					<MiniStat
						label="Reports imported"
						value={status.completedReportsCount}
					/>
					<MiniStat
						label="Medical reports"
						value={status.medicalReportsCount}
					/>
					<MiniStat label="Needs review" value={status.needsReviewCount} />
					<MiniStat
						label="Last scan"
						value={
							status.lastScanAt
								? new Intl.DateTimeFormat(undefined, {
										dateStyle: 'medium',
										timeStyle: 'short',
									}).format(new Date(status.lastScanAt))
								: 'Never'
						}
					/>
					<MiniStat
						label="Ignored/skipped"
						value={status.skippedIgnoredCount}
					/>
				</div>
			) : null}

			{error ? (
				<div
					style={{
						background: 'rgba(255,69,58,0.08)',
						border: '1px solid rgba(255,69,58,0.2)',
						borderRadius: 12,
						padding: '12px 14px',
						marginBottom: 16,
						fontSize: 13,
						color: C.red,
					}}
				>
					{error}
				</div>
			) : null}

			{isLoading ? (
				<div style={{ fontSize: 13, color: C.textSec, padding: '12px 0' }}>
					Loading…
				</div>
			) : !hasAnyAssignments ? (
				<div
					style={{
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 18,
						padding: 24,
						textAlign: 'center',
					}}
				>
					<div
						style={{
							width: 52,
							height: 52,
							borderRadius: 16,
							background: 'rgba(108,111,255,0.12)',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							margin: '0 auto 16px',
						}}
					>
						<FolderOpen size={24} color={C.accent} />
					</div>
					<div
						style={{
							fontSize: 16,
							fontWeight: 700,
							color: C.text,
							marginBottom: 8,
						}}
					>
						No Health Folders Configured
					</div>
					<div
						style={{
							fontSize: 13,
							color: C.textSec,
							lineHeight: 1.5,
							marginBottom: 18,
						}}
					>
						Assign folders to automatically discover and import medical reports.
					</div>
					<button
						type="button"
						onClick={() => navigate(ROUTES.healthFolderSetup)}
						style={{
							background: C.accent,
							border: 'none',
							borderRadius: 100,
							padding: '12px 20px',
							fontSize: 13,
							fontWeight: 700,
							color: C.white,
							cursor: 'pointer',
							fontFamily: 'inherit',
						}}
					>
						Assign Folder
					</button>
				</div>
			) : (
				<div
					style={{
						background: C.card,
						border: `1px solid ${C.border}`,
						borderRadius: 18,
						overflow: 'hidden',
					}}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 10,
							padding: '14px 16px',
							borderBottom: `1px solid ${C.border}`,
							background: C.card2,
						}}
					>
						<Cloud size={18} color={C.accentBlue} />
						<div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
							Google Drive
						</div>
					</div>

					<div style={{ padding: '4px 16px' }}>
						{uniqueMembers.map((member) => {
							const memberAssignments = assignments.filter(
								(assignment) => assignment.familyMemberId === member.id,
							)
							const memberLabel = formatMemberLabel(member)

							if (memberAssignments.length === 0) {
								return (
									<div
										key={member.id}
										style={{ borderBottom: `1px solid ${C.border}` }}
									>
										<HealthFolderAssignmentCard
											memberLabel={memberLabel}
											folderName=""
											status="not_configured"
											onSelectFolder={() => navigate(ROUTES.healthFolderSetup)}
										/>
									</div>
								)
							}

							return memberAssignments.map((assignment, index) => {
								const folderStatus = status?.folders.find(
									(folder) => folder.assignmentId === assignment.id,
								)

								return (
									<div
										key={assignment.id}
										style={{
											borderBottom:
												index === memberAssignments.length - 1
													? `1px solid ${C.border}`
													: 'none',
										}}
									>
										<HealthFolderAssignmentCard
											memberLabel={memberLabel}
											folderName={assignment.folderName}
											assignedAt={assignment.assignedAt}
											status={isScanning ? 'scanning' : 'configured'}
											documentsScanned={folderStatus?.importCandidates ?? 0}
											medicalReports={folderStatus?.medicalReports ?? 0}
											lastScanAt={folderStatus?.lastScanAt ?? null}
											nextScheduledScanAt={
												folderStatus?.nextScheduledScanAt ?? null
											}
											onChange={() => navigate(ROUTES.healthFolderSetup)}
											onRemove={() =>
												void handleRemoveAssignment(
													assignment.id,
													assignment.folderName,
												)
											}
										/>
									</div>
								)
							})
						})}
					</div>
				</div>
			)}

			{!isLoading && hasAnyAssignments ? (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						gap: 8,
						marginTop: 14,
						fontSize: 12,
						color: C.textSec,
					}}
				>
					<Check size={14} color={C.greenAlt} />
					Scan manually from here or assign folders in Google Drive. Automatic
					24h scans are not enabled yet.
				</div>
			) : null}
		</div>
	)
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
	return (
		<div
			style={{
				background: C.card,
				border: `1px solid ${C.border}`,
				borderRadius: 12,
				padding: '10px 12px',
			}}
		>
			<div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>
				{label}
			</div>
			<div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
				{value}
			</div>
		</div>
	)
}
