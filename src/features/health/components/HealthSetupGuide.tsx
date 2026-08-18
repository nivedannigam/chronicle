import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
	Check,
	ChevronRight,
	Cloud,
	FolderOpen,
	Loader2,
	ScanSearch,
	ShieldCheck,
} from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES, healthSettingsSection } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { runHealthImportJourney } from '@/features/health-import/services/health-import-journey.service'
import { describeImportJourneyResult } from '@/features/health-import/services/import-journey-summary'
import type { ImportJourneyResult } from '@/features/health-import/types/health-import-journey.types'
import { MODULE_UX_COPY } from '@/features/modules/contracts/module-ux.contract'
import { useHealthMemberSetup } from '@/features/health/hooks/useHealthMemberSetup'
import { reprocessStuckHealthReports } from '@/features/health/services/health-processing.service'
import { FigmaCard, FigmaSectionLabel } from '@/ui/figma/components/primitives'
import { scrollToSectionElement } from '@/lib/scroll-to-section'

const STEPS = [
	{
		id: 'connect_drive',
		title: 'Connect Google Drive',
		description:
			'Link the Google account where your medical reports are stored.',
		icon: Cloud,
	},
	{
		id: 'assign_folder',
		title: 'Choose health folder',
		description: 'Assign a Drive folder to the selected family member.',
		icon: FolderOpen,
	},
	{
		id: 'scan_import',
		title: 'Scan & import reports',
		description:
			'Chronicle finds medical PDFs, extracts data, and prepares them for review.',
		icon: ScanSearch,
	},
	{
		id: 'review_imports',
		title: 'Review & approve',
		description:
			'Confirm detected reports before they appear on your dashboard.',
		icon: ShieldCheck,
	},
] as const

const SUMMARY_TONE_COLORS = {
	success: C.greenAlt,
	warning: C.orange,
	error: C.red,
	info: C.textSec,
} as const

interface HealthSetupGuideProps {
	compact?: boolean
}

export function HealthSetupGuide({ compact = false }: HealthSetupGuideProps) {
	const navigate = useNavigate()
	const { user } = useAuth()
	const { selectedMember, selectedMemberId } = useFamilyContext()
	const setup = useHealthMemberSetup()
	const [isScanning, setIsScanning] = useState(false)
	const [scanDetail, setScanDetail] = useState<string | null>(null)
	const [scanError, setScanError] = useState<string | null>(null)
	const [journeyResult, setJourneyResult] =
		useState<ImportJourneyResult | null>(null)

	const navigateToReview = () => {
		navigate(healthSettingsSection('review'))
		window.setTimeout(() => {
			scrollToSectionElement('review')
		}, 150)
	}

	const handleStepNavigation = (stepId: (typeof STEPS)[number]['id']) => {
		switch (stepId) {
			case 'connect_drive':
				navigate(ROUTES.profileConnectionsDrive)
				return
			case 'assign_folder':
				navigate(ROUTES.healthFolderSetup)
				return
			case 'scan_import':
				if (setup.memberAssignments.length === 0) {
					navigate(ROUTES.healthFolderSetup)
					return
				}
				void handlePrimaryAction()
				return
			case 'review_imports':
				navigateToReview()
				return
			default:
				return
		}
	}

	const handlePrimaryAction = async () => {
		if (!user?.id) {
			return
		}

		switch (setup.currentStep) {
			case 'connect_drive':
				navigate(ROUTES.profileConnectionsDrive)
				return
			case 'assign_folder':
				navigate(ROUTES.healthFolderSetup)
				return
			case 'review_imports':
				navigateToReview()
				return
			case 'scan_import': {
				const folderIds = setup.memberAssignments.map(
					(assignment) => assignment.externalFolderId,
				)

				if (folderIds.length === 0) {
					navigate(ROUTES.healthFolderSetup)
					return
				}

				setIsScanning(true)
				setScanError(null)
				setJourneyResult(null)
				setScanDetail('Starting scan…')

				try {
					const result = await runHealthImportJourney(
						user.id,
						folderIds,
						(progress) => {
							setScanDetail(progress.detail)
						},
					)

					setJourneyResult(result)
					await setup.refetch()

					if (
						result.outcome === 'failed' ||
						(result.outcome === 'partial_success' && result.failedThisRun > 0)
					) {
						setScanError(
							result.primaryError ??
								result.errorMessage ??
								'Import did not complete successfully.',
						)
					} else if (
						result.outcome === 'no_reports' &&
						setup.reportsNeedingReprocess === 0
					) {
						setScanError(null)
					}
				} catch (error) {
					setScanError(
						error instanceof Error
							? error.message
							: `${MODULE_UX_COPY.errorGeneric.body} Please try again.`,
					)
				} finally {
					setIsScanning(false)
					setScanDetail(null)
				}

				return
			}
			default:
				return
		}
	}

	const handleReprocessStuck = async () => {
		if (!user?.id) {
			return
		}

		setIsScanning(true)
		setScanError(null)
		setJourneyResult(null)
		setScanDetail('Organizing your reports…')

		try {
			const reprocess = await reprocessStuckHealthReports(user.id, {
				familyMemberId: selectedMemberId,
			})

			await setup.refetch()

			if (reprocess.succeeded > 0) {
				setJourneyResult({
					outcome: reprocess.failed > 0 ? 'partial_success' : 'success',
					filesFound: 0,
					documentsScanned: 0,
					importCandidates: 0,
					medicalReports: 0,
					needsReview: 0,
					skippedIgnored: 0,
					reportsImported: reprocess.succeeded,
					importedThisRun: reprocess.succeeded,
					failedThisRun: reprocess.failed,
					skippedThisRun: 0,
					autoApprovedCount: 0,
					metricsExtracted: 0,
					failedCount: reprocess.failed,
					errorMessage: null,
					phasesCompleted: ['assign', 'metrics', 'summary'],
					phasesSucceeded: ['assign', 'metrics', 'summary'],
				})
			} else if (reprocess.processed > 0) {
				setScanError(
					'Reprocessed reports but no laboratory metrics were extracted. Check OCR output or try again after restarting the app.',
				)
			} else {
				setScanError('No reports need reprocessing right now.')
			}
		} catch (error) {
			setScanError(
				error instanceof Error
					? error.message
					: 'Reprocess failed. Please try again.',
			)
		} finally {
			setIsScanning(false)
			setScanDetail(null)
		}
	}

	const primaryLabel = (() => {
		switch (setup.currentStep) {
			case 'connect_drive':
				return 'Connect Google Drive'
			case 'assign_folder':
				return 'Assign health folder'
			case 'scan_import':
				if (isScanning) {
					return 'Importing…'
				}

				if (setup.reportsNeedingReprocess > 0) {
					return 'Retry scan & reprocess'
				}

				return 'Scan & import now'
			case 'review_imports':
				return `Review ${setup.needsReview} report${setup.needsReview === 1 ? '' : 's'}`
			default:
				return 'Get started'
		}
	})()

	const journeySummary = journeyResult
		? describeImportJourneyResult(journeyResult)
		: null

	const stepIndex = STEPS.findIndex((step) => step.id === setup.currentStep)

	return (
		<FigmaCard
			style={{
				padding: compact ? '16px' : '20px 18px',
				marginBottom: compact ? 16 : 24,
			}}
		>
			<FigmaSectionLabel>Get started</FigmaSectionLabel>
			<div
				style={{
					fontSize: compact ? 18 : 22,
					fontWeight: 800,
					letterSpacing: '-0.03em',
					marginBottom: 6,
				}}
			>
				Complete Health for {selectedMember?.displayName ?? 'this member'}
			</div>
			<div
				style={{
					fontSize: 13,
					color: C.textMuted,
					lineHeight: 1.5,
					marginBottom: 16,
				}}
			>
				Connect Google Drive, choose a folder, and Chronicle handles the rest.
			</div>

			{setup.reportsNeedingReprocess > 0 && !isScanning ? (
				<div
					style={{
						fontSize: 12,
						color: C.orange,
						background: 'rgba(245,158,11,0.08)',
						border: '1px solid rgba(245,158,11,0.22)',
						borderRadius: 12,
						padding: '10px 12px',
						marginBottom: 12,
						lineHeight: 1.45,
					}}
				>
					{setup.reportsNeedingReprocess} report
					{setup.reportsNeedingReprocess === 1 ? '' : 's'} imported but missing
					metrics. Scan again to reprocess with the latest parser.
				</div>
			) : null}

			{setup.processingReportsCount > 0 && !isScanning ? (
				<div
					style={{
						fontSize: 12,
						color: C.textSec,
						marginBottom: 12,
						display: 'flex',
						alignItems: 'center',
						gap: 8,
					}}
				>
					<Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
					{setup.processingReportsCount} report
					{setup.processingReportsCount === 1 ? '' : 's'} still organizing…
				</div>
			) : null}

			<div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
				{STEPS.map((step, index) => {
					const Icon = step.icon
					const completed = index < stepIndex || setup.currentStep === 'ready'
					const active = step.id === setup.currentStep

					return (
						<button
							key={step.id}
							type="button"
							onClick={() => {
								if (completed || active) {
									handleStepNavigation(step.id)
								}
							}}
							disabled={!completed && !active}
							style={{
								display: 'flex',
								alignItems: 'flex-start',
								gap: 12,
								padding: '12px 14px',
								borderRadius: 14,
								background: active ? `${C.accentBlue}12` : C.card2,
								border: active
									? `1px solid ${C.accentBlue}44`
									: `1px solid ${C.border}`,
								cursor: completed || active ? 'pointer' : 'default',
								textAlign: 'left',
								width: '100%',
								fontFamily: 'inherit',
								opacity: !completed && !active ? 0.72 : 1,
							}}
						>
							<div
								style={{
									width: 32,
									height: 32,
									borderRadius: 10,
									background: completed ? `${C.greenAlt}22` : C.card,
									border: `1px solid ${completed ? C.greenAlt : C.border}`,
									display: 'flex',
									alignItems: 'center',
									justifyContent: 'center',
									flexShrink: 0,
								}}
							>
								{completed ? (
									<Check size={16} color={C.greenAlt} />
								) : (
									<Icon size={16} color={active ? C.accentBlue : C.textMuted} />
								)}
							</div>
							<div style={{ flex: 1 }}>
								<div
									style={{
										fontSize: 14,
										fontWeight: 700,
										color: C.text,
										marginBottom: 2,
									}}
								>
									{step.title}
								</div>
								<div
									style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.45 }}
								>
									{step.description}
								</div>
							</div>
						</button>
					)
				})}
			</div>

			{scanDetail ? (
				<div
					style={{
						fontSize: 12,
						color: C.textSec,
						marginBottom: 12,
						display: 'flex',
						alignItems: 'center',
						gap: 8,
					}}
				>
					<Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
					{scanDetail}
				</div>
			) : null}

			{journeySummary ? (
				<div
					style={{
						fontSize: 13,
						color: SUMMARY_TONE_COLORS[journeySummary.tone],
						background:
							journeySummary.tone === 'error'
								? 'rgba(239,68,68,0.08)'
								: journeySummary.tone === 'success'
									? 'rgba(52,211,153,0.08)'
									: 'rgba(255,255,255,0.04)',
						border: `1px solid ${SUMMARY_TONE_COLORS[journeySummary.tone]}33`,
						borderRadius: 12,
						padding: '10px 12px',
						marginBottom: 12,
						lineHeight: 1.45,
					}}
				>
					<div style={{ fontWeight: 700, marginBottom: 4 }}>
						{journeySummary.title}
					</div>
					<div>{journeySummary.message}</div>
					{journeyResult ? (
						<div
							style={{
								fontSize: 11,
								color: C.textMuted,
								marginTop: 6,
							}}
						>
							Imported this run: {journeyResult.importedThisRun} · Failed:{' '}
							{journeyResult.failedThisRun} · Skipped:{' '}
							{journeyResult.skippedThisRun}
						</div>
					) : null}
				</div>
			) : null}

			{scanError ? (
				<div
					style={{
						fontSize: 13,
						color: C.red,
						marginBottom: 12,
						lineHeight: 1.45,
					}}
				>
					{scanError}
				</div>
			) : null}

			{setup.currentStep !== 'ready' ? (
				<div style={{ display: 'grid', gap: 10 }}>
					<button
						type="button"
						onClick={() => void handlePrimaryAction()}
						disabled={isScanning || setup.isLoading}
						style={{
							width: '100%',
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'center',
							gap: 8,
							background: C.accentBlue,
							color: C.white,
							border: 'none',
							borderRadius: 100,
							padding: '12px 18px',
							fontSize: 14,
							fontWeight: 700,
							cursor: isScanning || setup.isLoading ? 'not-allowed' : 'pointer',
							fontFamily: 'inherit',
							opacity: isScanning || setup.isLoading ? 0.7 : 1,
							minHeight: 44,
						}}
					>
						{isScanning ? (
							<Loader2
								size={16}
								style={{ animation: 'spin 1s linear infinite' }}
							/>
						) : null}
						{primaryLabel}
						{!isScanning ? <ChevronRight size={16} /> : null}
					</button>

					{setup.reportsNeedingReprocess > 0 ? (
						<button
							type="button"
							onClick={() => void handleReprocessStuck()}
							disabled={isScanning || setup.isLoading}
							style={{
								width: '100%',
								background: C.card2,
								color: C.textSec,
								border: `1px solid ${C.border}`,
								borderRadius: 100,
								padding: '10px 16px',
								fontSize: 13,
								fontWeight: 600,
								cursor:
									isScanning || setup.isLoading ? 'not-allowed' : 'pointer',
								fontFamily: 'inherit',
								opacity: isScanning || setup.isLoading ? 0.7 : 1,
							}}
						>
							Reprocess without re-downloading
						</button>
					) : null}

					{journeyResult?.outcome === 'failed' ||
					setup.reportsNeedingReprocess > 0 ? (
						<button
							type="button"
							onClick={() => navigate(ROUTES.healthReports)}
							style={{
								width: '100%',
								background: 'transparent',
								color: C.textMuted,
								border: 'none',
								padding: '4px 0',
								fontSize: 12,
								fontWeight: 600,
								cursor: 'pointer',
								fontFamily: 'inherit',
								textDecoration: 'underline',
							}}
						>
							View report status
						</button>
					) : null}
				</div>
			) : null}
		</FigmaCard>
	)
}
