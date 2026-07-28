import { useCallback, useMemo, useRef, useState } from 'react'
import {
	formatMemberLabel,
	suggestFolderAssignment,
} from '@/features/family/services/folder-match.service'
import {
	assignHealthSourceFolders,
	getMemberExistingFolders,
} from '@/features/family/services/health-sources.service'
import type {
	AssignmentSuccessInfo,
	ExistingFolderMode,
	FamilyMemberWithAliases,
	FolderAssignmentStep,
	HealthSourceAssignment,
} from '@/features/family/types/family.types'
import { mapAssignmentError } from '@/features/family/utils/assignment-errors'
import { dedupeFamilyMembers } from '@/features/family/utils/dedupe-family-members'
import { dedupeMemberLabels } from '@/features/family/utils/dedupe-member-labels'
import { runHealthImportJourney } from '@/features/health-import/services/health-import-journey.service'
import { invalidateAfterFolderAssignment } from '@/lib/query-invalidation'
import { resetFailedImportCandidates } from '@/features/medical-discovery/services/import-pipeline.service'
import type {
	ImportJourneyPhase,
	ImportJourneyResult,
} from '@/features/health-import/types/health-import-journey.types'

interface UseFolderAssignmentFlowOptions {
	userId: string
	folderId: string
	folderName: string
	members: FamilyMemberWithAliases[]
	assignments: HealthSourceAssignment[]
	preferredMemberId?: string | null
	onRefresh: () => Promise<void>
	onJourneyComplete?: (result: ImportJourneyResult) => void
}

export function useFolderAssignmentFlow({
	userId,
	folderId,
	folderName,
	members,
	assignments,
	preferredMemberId,
	onRefresh,
	onJourneyComplete,
}: UseFolderAssignmentFlowOptions) {
	const uniqueMembers = useMemo(() => dedupeFamilyMembers(members), [members])
	const journeyStartedRef = useRef(false)

	const currentFolderAssignments = useMemo(
		() =>
			assignments.filter(
				(assignment) => assignment.externalFolderId === folderId,
			),
		[assignments, folderId],
	)

	const suggestion = useMemo(
		() => suggestFolderAssignment(folderName, uniqueMembers),
		[folderName, uniqueMembers],
	)

	const [isOpen, setIsOpen] = useState(false)
	const [step, setStep] = useState<FolderAssignmentStep>('pick')
	const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
	const [existingFolders, setExistingFolders] = useState<
		HealthSourceAssignment[]
	>([])
	const [existingMode, setExistingMode] = useState<ExistingFolderMode>('add')
	const [isSaving, setIsSaving] = useState(false)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [successInfo, setSuccessInfo] = useState<AssignmentSuccessInfo | null>(
		null,
	)
	const [journeyPhase, setJourneyPhase] = useState<ImportJourneyPhase>('assign')
	const [journeyPhasesCompleted, setJourneyPhasesCompleted] = useState<
		ImportJourneyPhase[]
	>(['assign'])
	const [journeyPhasesSucceeded, setJourneyPhasesSucceeded] = useState<
		ImportJourneyPhase[]
	>(['assign'])
	const [journeyResult, setJourneyResult] =
		useState<ImportJourneyResult | null>(null)
	const [isJourneyRunning, setIsJourneyRunning] = useState(false)

	const resetState = useCallback(() => {
		setStep('pick')
		setSelectedMemberIds([])
		setExistingFolders([])
		setExistingMode('add')
		setErrorMessage(null)
		setSuccessInfo(null)
		setIsSaving(false)
		setJourneyPhase('assign')
		setJourneyPhasesCompleted(['assign'])
		setJourneyPhasesSucceeded(['assign'])
		setJourneyResult(null)
		setIsJourneyRunning(false)
		journeyStartedRef.current = false
	}, [])

	const open = useCallback(() => {
		resetState()

		if (currentFolderAssignments.length > 0) {
			setSelectedMemberIds(
				currentFolderAssignments.map((a) => a.familyMemberId),
			)
			setStep('pick')
		} else if (
			preferredMemberId &&
			uniqueMembers.some((member) => member.id === preferredMemberId)
		) {
			setSelectedMemberIds([preferredMemberId])
			if (suggestion?.memberId === preferredMemberId) {
				setStep('suggest')
			} else {
				setStep('pick')
			}
		} else if (suggestion) {
			setSelectedMemberIds([suggestion.memberId])
			setStep('suggest')
		} else {
			setStep('pick')
		}

		setIsOpen(true)
	}, [
		currentFolderAssignments,
		preferredMemberId,
		resetState,
		suggestion,
		uniqueMembers,
	])

	const close = useCallback(() => {
		if (isSaving || isJourneyRunning) {
			return
		}

		setIsOpen(false)
		resetState()
	}, [isJourneyRunning, isSaving, resetState])

	const toggleMember = useCallback((memberId: string) => {
		setSelectedMemberIds((current) =>
			current.includes(memberId)
				? current.filter((id) => id !== memberId)
				: [...current, memberId],
		)
	}, [])

	const checkExistingAndProceed = useCallback(
		async (memberIds: string[]) => {
			if (memberIds.length !== 1) {
				return false
			}

			const existing = await getMemberExistingFolders(
				userId,
				memberIds[0],
				folderId,
			)

			if (existing.length > 0) {
				setExistingFolders(existing)
				setExistingMode('add')
				setStep('existing')
				return true
			}

			return false
		},
		[folderId, userId],
	)

	const startImportJourney = useCallback(
		async (info: AssignmentSuccessInfo) => {
			if (journeyStartedRef.current) {
				return
			}

			journeyStartedRef.current = true
			setIsJourneyRunning(true)
			setJourneyPhase('scanning')
			setJourneyPhasesCompleted(['assign'])
			setJourneyPhasesSucceeded(['assign'])
			setJourneyResult(null)
			setErrorMessage(null)

			try {
				const result = await runHealthImportJourney(
					userId,
					[info.externalFolderId],
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

				if (result.outcome === 'failed') {
					setErrorMessage(result.primaryError ?? result.errorMessage)
				} else if (result.outcome === 'partial_success') {
					setErrorMessage(result.primaryError ?? result.errorMessage)
				} else {
					setErrorMessage(null)
				}

				invalidateAfterFolderAssignment(userId)
				await onRefresh()
				onJourneyComplete?.(result)
			} catch (error) {
				const message = mapAssignmentError(error)
				setErrorMessage(message)
				setJourneyResult({
					outcome: 'failed',
					filesFound: 0,
					documentsScanned: 0,
					importCandidates: 0,
					medicalReports: 0,
					needsReview: 0,
					skippedIgnored: 0,
					reportsImported: 0,
					importedThisRun: 0,
					failedThisRun: 1,
					skippedThisRun: 0,
					autoApprovedCount: 0,
					metricsExtracted: 0,
					failedCount: 1,
					errorMessage: message,
					primaryError: message,
					errorSamples: [message],
					phasesCompleted: ['assign', 'scanning', 'summary'],
					phasesSucceeded: ['assign', 'summary'],
				})
				setJourneyPhase('summary')
				setJourneyPhasesCompleted(['assign', 'scanning', 'summary'])
				setJourneyPhasesSucceeded(['assign', 'summary'])
			} finally {
				setIsJourneyRunning(false)
			}
		},
		[onJourneyComplete, onRefresh, userId],
	)

	const performAssign = useCallback(
		async (memberIds: string[], mode: ExistingFolderMode = 'add') => {
			setIsSaving(true)
			setErrorMessage(null)

			try {
				await assignHealthSourceFolders({
					userId,
					externalFolderId: folderId,
					folderName,
					familyMemberIds: memberIds,
					mode,
				})
				invalidateAfterFolderAssignment(userId)
				await onRefresh()

				const labels = dedupeMemberLabels(
					memberIds.map((id) => {
						const member = uniqueMembers.find((entry) => entry.id === id)
						return member ? formatMemberLabel(member) : 'Family member'
					}),
				)

				const info: AssignmentSuccessInfo = {
					memberLabels: labels,
					folderName,
					externalFolderId: folderId,
				}

				setSuccessInfo(info)
				setStep('journey')
				setJourneyPhase('assign')
				void startImportJourney(info)
			} catch (error) {
				setErrorMessage(mapAssignmentError(error))
			} finally {
				setIsSaving(false)
			}
		},
		[
			folderId,
			folderName,
			onRefresh,
			startImportJourney,
			uniqueMembers,
			userId,
		],
	)

	const handleConfirmSuggestion = useCallback(async () => {
		if (!suggestion) {
			return
		}

		setSelectedMemberIds([suggestion.memberId])
		const hasExisting = await checkExistingAndProceed([suggestion.memberId])

		if (!hasExisting) {
			await performAssign([suggestion.memberId], 'add')
		}
	}, [checkExistingAndProceed, performAssign, suggestion])

	const handleChooseDifferentPerson = useCallback(() => {
		setErrorMessage(null)
		journeyStartedRef.current = false
		setJourneyResult(null)
		setJourneyPhase('assign')
		setStep('pick')
	}, [])

	const handleAssign = useCallback(async () => {
		if (selectedMemberIds.length === 0) {
			return
		}

		const hasExisting = await checkExistingAndProceed(selectedMemberIds)

		if (!hasExisting) {
			await performAssign(selectedMemberIds, 'add')
		}
	}, [checkExistingAndProceed, performAssign, selectedMemberIds])

	const handleContinueExisting = useCallback(async () => {
		await performAssign(selectedMemberIds, existingMode)
	}, [existingMode, performAssign, selectedMemberIds])

	const handleRetryJourney = useCallback(() => {
		if (!successInfo) {
			return
		}

		journeyStartedRef.current = false

		void (async () => {
			await resetFailedImportCandidates(userId)
			await startImportJourney(successInfo)
		})()
	}, [startImportJourney, successInfo, userId])

	const handleChooseDifferentFolder = useCallback(() => {
		journeyStartedRef.current = false
		setIsOpen(false)
		resetState()
	}, [resetState])

	const isAssigned = currentFolderAssignments.length > 0

	return {
		isOpen,
		step,
		suggestion,
		selectedMemberIds,
		existingFolders,
		existingMode,
		isSaving,
		errorMessage,
		successInfo,
		journeyPhase,
		journeyPhasesCompleted,
		journeyPhasesSucceeded,
		journeyResult,
		isJourneyRunning,
		currentFolderAssignments,
		isAssigned,
		open,
		close,
		toggleMember,
		setExistingMode,
		handleConfirmSuggestion,
		handleChooseDifferentPerson,
		handleAssign,
		handleContinueExisting,
		handleRetryJourney,
		handleChooseDifferentFolder,
	}
}
