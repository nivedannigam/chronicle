import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Cloud, Eye, Folder, RefreshCw } from 'lucide-react'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { useHealthSources } from '@/features/family/hooks/useHealthSources'
import { ImportCenter } from '@/features/health-import/components/ImportCenter'
import { ImportJourneyStep } from '@/features/health-import/components/ImportJourneyStep'
import { useHealthImportStatus } from '@/features/health-import/hooks/useHealthImportStatus'
import { runHealthImportJourney } from '@/features/health-import/services/health-import-journey.service'
import type {
	ImportJourneyPhase,
	ImportJourneyResult,
} from '@/features/health-import/types/health-import-journey.types'
import { ImportReviewPanel } from '@/features/medical-discovery/components/ImportReviewPanel'
import { DashboardEmptyState } from '@/features/health/components/dashboard/DashboardEmptyState'
import { HealthSetupGuide } from '@/features/health/components/HealthSetupGuide'
import { OcrProviderStatusPanel } from '@/features/health/components/OcrStatusBanner'
import { useOcrProviderStatus } from '@/features/health/hooks/useOcrProviderStatus'
import { useHealthImport } from '@/features/health-import/hooks/useHealthImport'
import {
	buildSetupReportRows,
	buildSetupSummaryLine,
} from '@/features/health-import/utils/setup-report-list.utils'
import { useHealthMemberSetup } from '@/features/health/hooks/useHealthMemberSetup'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { scrollToSectionElement } from '@/lib/scroll-to-section'
import { FigmaHealthSectionLabel } from '@/ui/figma/health/figma-health-primitives'
import { FC, FigmaIconBox, figmaCardStyle } from '@/ui/figma/v2/atoms'

/** Engineering import console — not linked from consumer Health Settings. */
export function HealthImportConsolePage() {
	const navigate = useNavigate()
	const location = useLocation()
	const { user } = useAuth()
	const userId = user?.id
	const { selectedMember, selectedMemberId, accountOwnerMemberId } =
		useFamilyContext()
	const setup = useHealthMemberSetup()
	const { assignments, isLoading, refresh } = useHealthSources(userId)
	const importStatus = useHealthImportStatus(userId)
	const healthImport = useHealthImport(userId)
	const { data: memberReports = [] } = useMemberHealthReports()
	const ocrStatus = useOcrProviderStatus(userId)

	const setupSummary = useMemo(() => {
		const rows = buildSetupReportRows({
			registry: healthImport.registry,
			reports: memberReports,
			memberId: selectedMemberId,
			accountOwnerMemberId,
		})

		return buildSetupSummaryLine(rows)
	}, [
		healthImport.registry,
		memberReports,
		selectedMemberId,
		accountOwnerMemberId,
	])

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
	const showSetupGuide = setup.currentStep !== 'ready'
	const showReportList =
		!showSetupGuide ||
		setup.needsReview > 0 ||
		setup.reportsNeedingReprocess > 0

	useEffect(() => {
		const sectionId = location.hash.replace('#', '').trim()

		if (!sectionId) {
			return
		}

		let attempts = 0
		const maxAttempts = 8

		const tryScroll = () => {
			attempts += 1
			const scrolled = scrollToSectionElement(sectionId)

			if (!scrolled && attempts < maxAttempts) {
				window.setTimeout(tryScroll, 120)
			}
		}

		requestAnimationFrame(tryScroll)
	}, [location.hash, setup.needsReview, showReportList])

	if (!userId) {
		return (
			<DashboardEmptyState
				title="Sign in to manage health setup"
				message="Connect Google Drive and assign folders once you are signed in."
				emoji="🔐"
			/>
		)
	}

	if (!selectedMember) {
		return (
			<DashboardEmptyState
				title="Choose a family member"
				message="Select who you are setting up health import for from the Family tab."
				emoji="👨‍👩‍👧"
				actionLabel="Go to Family"
				onAction={() => navigate(ROUTES.profileFamily)}
			/>
		)
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

			await Promise.all([
				refresh(),
				setup.refetch(),
				importStatus.refetch(),
				ocrStatus.refetch(),
			])
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
			<OcrProviderStatusPanel
				status={ocrStatus.data}
				isLoading={ocrStatus.isLoading}
			/>

			{showSetupGuide ? <HealthSetupGuide compact /> : null}

			<div style={{ marginBottom: 12 }}>
				<FigmaHealthSectionLabel>Connected Drive</FigmaHealthSectionLabel>
			</div>
			<div
				style={{
					...figmaCardStyle,
					borderRadius: 20,
					padding: '16px 18px',
					display: 'flex',
					alignItems: 'center',
					gap: 13,
					marginBottom: 24,
				}}
			>
				<FigmaIconBox
					color={setup.driveConnected ? FC.green : FC.amber}
					size={42}
				>
					<Cloud
						size={18}
						color={setup.driveConnected ? FC.green : FC.amber}
						strokeWidth={1.8}
					/>
				</FigmaIconBox>
				<div style={{ flex: 1 }}>
					<p
						style={{
							color: FC.fg,
							fontSize: 14.5,
							fontWeight: 600,
							marginBottom: 3,
							marginTop: 0,
						}}
					>
						Google Drive
					</p>
					<p
						style={{
							color: setup.driveConnected ? FC.green : FC.amber,
							fontSize: 13,
							fontWeight: 500,
							margin: 0,
						}}
					>
						{setup.driveConnected
							? `Connected · ${memberAssignments.length} folder${memberAssignments.length === 1 ? '' : 's'}`
							: 'Not connected'}
					</p>
				</div>
				<button
					type="button"
					onClick={() => navigate(ROUTES.profileConnectionsDrive)}
					style={{
						background: FC.ghost,
						border: `1px solid ${FC.line}`,
						borderRadius: 12,
						padding: '7px 15px',
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					<span style={{ color: FC.mid, fontSize: 13 }}>
						{setup.driveConnected ? 'Manage' : 'Connect'}
					</span>
				</button>
			</div>

			<div style={{ marginBottom: 12 }}>
				<FigmaHealthSectionLabel>Assigned Folder</FigmaHealthSectionLabel>
			</div>
			{isLoading ? (
				<div style={{ color: FC.dim, fontSize: 13, marginBottom: 24 }}>
					Loading…
				</div>
			) : memberAssignments.length === 0 ? (
				<div
					style={{
						...figmaCardStyle,
						borderRadius: 20,
						padding: '16px 18px',
						marginBottom: 24,
						color: FC.mid,
						fontSize: 14,
						lineHeight: 1.5,
					}}
				>
					No folder assigned for {memberLabel} yet.
					<button
						type="button"
						onClick={() => navigate(ROUTES.healthFolderSetup)}
						style={{
							display: 'block',
							marginTop: 12,
							background: FC.blue,
							color: '#fff',
							border: 'none',
							borderRadius: 12,
							padding: '8px 14px',
							cursor: 'pointer',
							fontFamily: 'inherit',
							fontWeight: 600,
							fontSize: 13,
						}}
					>
						Assign folder
					</button>
				</div>
			) : (
				<div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
					{memberAssignments.map((assignment) => {
						const folderStatus = status?.folders.find(
							(folder) => folder.assignmentId === assignment.id,
						)

						return (
							<div
								key={assignment.id}
								style={{
									...figmaCardStyle,
									borderRadius: 20,
									padding: '16px 18px',
								}}
							>
								<div
									style={{ display: 'flex', alignItems: 'flex-start', gap: 13 }}
								>
									<FigmaIconBox color={FC.blue} size={40}>
										<Folder size={17} color={FC.blue} strokeWidth={1.8} />
									</FigmaIconBox>
									<div style={{ flex: 1 }}>
										<p
											style={{
												color: FC.fg,
												fontSize: 14.5,
												fontWeight: 600,
												marginBottom: 8,
												marginTop: 0,
											}}
										>
											{memberLabel}
										</p>
										<p
											style={{ color: FC.dim, fontSize: 12, margin: '0 0 2px' }}
										>
											{assignment.folderName}
										</p>
										<p
											style={{ color: FC.dim, fontSize: 12, margin: '0 0 2px' }}
										>
											{folderStatus?.medicalReports ?? 0} reports ·{' '}
											{folderStatus?.documentsScanned ?? 0} documents
										</p>
										<div
											style={{
												display: 'flex',
												alignItems: 'center',
												gap: 5,
												marginTop: 10,
											}}
										>
											<div
												style={{
													width: 6,
													height: 6,
													borderRadius: 3,
													background: FC.green,
												}}
											/>
											<span
												style={{
													color: FC.green,
													fontSize: 12,
													fontWeight: 500,
												}}
											>
												{isScanning ? 'Scanning…' : 'Configured'}
											</span>
										</div>
									</div>
									<button
										type="button"
										onClick={() => navigate(ROUTES.healthFolderSetup)}
										style={{
											background: FC.ghost,
											border: `1px solid ${FC.line}`,
											borderRadius: 10,
											padding: '6px 12px',
											cursor: 'pointer',
											flexShrink: 0,
											fontFamily: 'inherit',
										}}
									>
										<span style={{ color: FC.mid, fontSize: 12 }}>Change</span>
									</button>
								</div>
							</div>
						)
					})}
				</div>
			)}

			{!showSetupGuide ? (
				<>
					<div style={{ marginBottom: 12 }}>
						<FigmaHealthSectionLabel>Import</FigmaHealthSectionLabel>
					</div>
					<div
						style={{
							...figmaCardStyle,
							borderRadius: 20,
							padding: '16px 18px',
							display: 'flex',
							alignItems: 'center',
							gap: 13,
							marginBottom: 12,
						}}
					>
						<FigmaIconBox color={FC.blue} size={40}>
							<RefreshCw size={17} color={FC.blue} strokeWidth={1.8} />
						</FigmaIconBox>
						<div style={{ flex: 1 }}>
							<p
								style={{
									color: FC.fg,
									fontSize: 14.5,
									fontWeight: 600,
									marginBottom: 3,
									marginTop: 0,
								}}
							>
								Scan for new reports
							</p>
							<p style={{ color: FC.mid, fontSize: 12.5, margin: 0 }}>
								{folderIds.length > 0
									? `${folderIds.length} folder${folderIds.length === 1 ? '' : 's'} ready`
									: 'Assign a folder first'}
							</p>
						</div>
						<button
							type="button"
							onClick={() => void handleScanNow()}
							disabled={isScanning || folderIds.length === 0}
							style={{
								background: FC.blue,
								borderRadius: 12,
								padding: '7px 16px',
								cursor:
									isScanning || folderIds.length === 0 ? 'default' : 'pointer',
								border: 'none',
								opacity: isScanning || folderIds.length === 0 ? 0.5 : 1,
								fontFamily: 'inherit',
							}}
						>
							<span style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>
								{isScanning ? 'Scanning…' : 'Scan now'}
							</span>
						</button>
					</div>
					<p
						style={{
							color: FC.dim,
							fontSize: 12.5,
							margin: '0 0 24px',
							paddingLeft: 2,
						}}
					>
						{setupSummary}
					</p>
				</>
			) : null}

			{journeyResult || journeyError || isScanning ? (
				<div style={{ marginBottom: 24 }}>
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
						onChooseDifferentFolder={() => navigate(ROUTES.healthFolderSetup)}
						onClose={() => {
							setJourneyResult(null)
							setJourneyError(null)
						}}
					/>
				</div>
			) : null}

			{setup.needsReview > 0 ||
			(importStatus.data?.actionableReviewCount ?? 0) > 0 ? (
				<div id="review" style={{ marginBottom: 24 }}>
					<div style={{ marginBottom: 12 }}>
						<FigmaHealthSectionLabel>Review reports</FigmaHealthSectionLabel>
					</div>
					<ImportReviewPanel userId={userId} />
				</div>
			) : null}

			{showReportList ? (
				<div id="import" style={{ marginBottom: 24 }}>
					<div style={{ marginBottom: 12 }}>
						<FigmaHealthSectionLabel>Reports</FigmaHealthSectionLabel>
					</div>
					<ImportCenter userId={userId} />
				</div>
			) : null}

			<div style={{ marginBottom: 12 }}>
				<FigmaHealthSectionLabel>Privacy</FigmaHealthSectionLabel>
			</div>
			<div
				style={{
					...figmaCardStyle,
					borderRadius: 20,
					padding: '16px 18px',
					display: 'flex',
					alignItems: 'center',
					gap: 13,
					marginBottom: 20,
				}}
			>
				<FigmaIconBox color={FC.purple} size={40}>
					<Eye size={17} color={FC.purple} strokeWidth={1.8} />
				</FigmaIconBox>
				<div style={{ flex: 1 }}>
					<p
						style={{
							color: FC.fg,
							fontSize: 14.5,
							fontWeight: 600,
							marginBottom: 3,
							marginTop: 0,
						}}
					>
						Health data
					</p>
					<p style={{ color: FC.mid, fontSize: 12.5, margin: 0 }}>
						Stored securely in your account
					</p>
				</div>
				<button
					type="button"
					onClick={() => navigate(ROUTES.settingsData)}
					style={{
						background: FC.ghost,
						border: `1px solid ${FC.line}`,
						borderRadius: 10,
						padding: '6px 12px',
						cursor: 'pointer',
						fontFamily: 'inherit',
					}}
				>
					<span style={{ color: FC.mid, fontSize: 12 }}>Manage</span>
				</button>
			</div>
		</div>
	)
}
