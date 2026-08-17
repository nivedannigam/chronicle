import { useCallback, useMemo, useRef, useState } from 'react'
import {
	resolveActiveFolderAssignmentModule,
	type FolderAssignmentModuleId,
	type FolderAssignmentModuleMode,
} from '@/features/connectors/services/folder-assignment-module.resolver'
import {
	formatMemberLabel,
	suggestFolderAssignment,
} from '@/features/family/services/folder-match.service'
import {
	assignHealthSourceFolders,
	getMemberExistingFolders,
} from '@/features/family/services/health-sources.service'
import {
	assignInsuranceSourceFolder,
	listInsuranceSourceAssignments,
} from '@/features/family/services/insurance-sources.service'
import {
	assignVehicleSourceFolder,
	listVehicleSourceAssignments,
} from '@/features/family/services/vehicle-sources.service'
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
import { discoverInsuranceCategoriesFromFolderNames } from '@/features/insurance/services/insurance-folder-discovery.service'
import { runHealthImportJourney } from '@/features/health-import/services/health-import-journey.service'
import { runInsuranceImportSync } from '@/features/insurance-import/services/insurance-import-runner.service'
import { runVehicleImportSync } from '@/features/vehicle-import/services/vehicle-import-runner.service'
import { invalidateAfterFolderAssignment } from '@/lib/query-invalidation'
import { resetFailedImportCandidates } from '@/features/medical-discovery/services/import-pipeline.service'
import type {
	ImportJourneyPhase,
	ImportJourneyResult,
} from '@/features/health-import/types/health-import-journey.types'
import type { ModuleFolderAssignment } from '@/features/settings/types/chronicle-module.types'

type FolderAssignmentSnapshot = Pick<
	ModuleFolderAssignment,
	| 'id'
	| 'userId'
	| 'folderId'
	| 'familyMemberId'
	| 'familyMemberName'
	| 'memberLabel'
	| 'externalFolderId'
	| 'folderName'
	| 'assignedAt'
	| 'enabled'
>

interface UseFolderAssignmentFlowOptions {
	userId: string
	folderId: string
	folderName: string
	members: FamilyMemberWithAliases[]
	assignments?: HealthSourceAssignment[]
	insuranceAssignments?: FolderAssignmentSnapshot[]
	vehicleAssignments?: FolderAssignmentSnapshot[]
	moduleMode?: FolderAssignmentModuleMode
	childFolderNames?: string[]
	preferredMemberId?: string | null
	onRefresh: () => Promise<void>
	onJourneyComplete?: (result: ImportJourneyResult) => void
}

function toBadgeAssignments(
	assignments: FolderAssignmentSnapshot[],
): HealthSourceAssignment[] {
	return assignments.map((assignment) => ({
		id: assignment.id,
		userId: assignment.userId,
		connectorId: 'google-drive',
		folderId: assignment.folderId,
		familyMemberId: assignment.familyMemberId,
		familyMemberName: assignment.familyMemberName,
		memberLabel: assignment.memberLabel,
		externalFolderId: assignment.externalFolderId,
		folderName: assignment.folderName,
		assignedAt: assignment.assignedAt,
		enabled: assignment.enabled,
	}))
}

async function getExistingFoldersForModule(
	userId: string,
	moduleId: FolderAssignmentModuleId,
	familyMemberId: string,
	excludeExternalFolderId?: string,
): Promise<HealthSourceAssignment[]> {
	switch (moduleId) {
		case 'insurance': {
			const assignments = await listInsuranceSourceAssignments(userId, {
				skipMigration: true,
			})

			return toBadgeAssignments(
				assignments.filter(
					(assignment) =>
						assignment.familyMemberId === familyMemberId &&
						assignment.externalFolderId !== excludeExternalFolderId,
				),
			)
		}
		case 'vehicles': {
			const assignments = await listVehicleSourceAssignments(userId)

			return toBadgeAssignments(
				assignments.filter(
					(assignment) =>
						assignment.familyMemberId === familyMemberId &&
						assignment.externalFolderId !== excludeExternalFolderId,
				),
			)
		}
		default:
			return getMemberExistingFolders(
				userId,
				familyMemberId,
				excludeExternalFolderId,
			)
	}
}

function buildModuleImportResult(
	moduleId: FolderAssignmentModuleId,
	input: {
		imported: number
		discovered: number
		errorMessage?: string | null
	},
): ImportJourneyResult {
	const phasesCompleted: ImportJourneyPhase[] = [
		'assign',
		'scanning',
		'detection',
		'summary',
	]
	const succeeded = input.errorMessage
		? (['assign'] as ImportJourneyPhase[])
		: phasesCompleted

	return {
		outcome: input.errorMessage
			? 'failed'
			: input.imported > 0
				? 'success'
				: 'no_reports',
		filesFound: input.discovered,
		documentsScanned: input.discovered,
		importCandidates: input.discovered,
		medicalReports: moduleId === 'health' ? input.imported : 0,
		needsReview: 0,
		skippedIgnored: 0,
		reportsImported: input.imported,
		importedThisRun: input.imported,
		failedThisRun: input.errorMessage ? 1 : 0,
		skippedThisRun: 0,
		autoApprovedCount: input.imported,
		metricsExtracted: 0,
		failedCount: input.errorMessage ? 1 : 0,
		errorMessage: input.errorMessage ?? null,
		primaryError: input.errorMessage ?? null,
		phasesCompleted,
		phasesSucceeded: succeeded,
	}
}

export function useFolderAssignmentFlow({
	userId,
	folderId,
	folderName,
	members,
	assignments = [],
	insuranceAssignments = [],
	vehicleAssignments = [],
	moduleMode = 'health',
	childFolderNames = [],
	preferredMemberId,
	onRefresh,
	onJourneyComplete,
}: UseFolderAssignmentFlowOptions) {
	const uniqueMembers = useMemo(() => dedupeFamilyMembers(members), [members])
	const journeyStartedRef = useRef(false)

	const moduleHints = useMemo(
		() => ({
			externalFolderId: folderId,
			insuranceFolderIds: new Set(
				insuranceAssignments.map((assignment) => assignment.externalFolderId),
			),
			vehicleFolderIds: new Set(
				vehicleAssignments.map((assignment) => assignment.externalFolderId),
			),
		}),
		[folderId, insuranceAssignments, vehicleAssignments],
	)

	const resolvedModule = useMemo(
		() =>
			resolveActiveFolderAssignmentModule(moduleMode, folderName, moduleHints),
		[folderName, moduleHints, moduleMode],
	)

	const [activeModuleId, setActiveModuleId] =
		useState<FolderAssignmentModuleId>(resolvedModule)

	const moduleAssignments = useMemo(() => {
		switch (activeModuleId) {
			case 'insurance':
				return toBadgeAssignments(insuranceAssignments)
			case 'vehicles':
				return toBadgeAssignments(vehicleAssignments)
			default:
				return assignments
		}
	}, [activeModuleId, assignments, insuranceAssignments, vehicleAssignments])

	const currentFolderAssignments = useMemo(
		() =>
			moduleAssignments.filter(
				(assignment) => assignment.externalFolderId === folderId,
			),
		[moduleAssignments, folderId],
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
		setActiveModuleId(resolvedModule)
	}, [resolvedModule])

	const open = useCallback(() => {
		resetState()

		if (currentFolderAssignments.length > 0) {
			setSelectedMemberIds(
				currentFolderAssignments.map((assignment) => assignment.familyMemberId),
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
		async (memberIds: string[], moduleId: FolderAssignmentModuleId) => {
			if (memberIds.length !== 1) {
				return false
			}

			const existing = await getExistingFoldersForModule(
				userId,
				moduleId,
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

	const runModuleImportJourney = useCallback(
		async (
			moduleId: FolderAssignmentModuleId,
			info: AssignmentSuccessInfo,
		): Promise<ImportJourneyResult> => {
			if (moduleId === 'insurance') {
				setJourneyPhase('scanning')
				setJourneyPhasesCompleted(['assign', 'scanning'])
				setJourneyPhasesSucceeded(['assign'])

				try {
					const syncResult = await runInsuranceImportSync(userId)

					setJourneyPhase('detection')
					setJourneyPhasesCompleted(['assign', 'scanning', 'detection'])
					setJourneyPhasesSucceeded(['assign', 'scanning', 'detection'])

					return buildModuleImportResult('insurance', {
						imported: syncResult.imported,
						discovered: syncResult.discovered,
					})
				} catch (error) {
					const message =
						error instanceof Error ? error.message : 'Insurance import failed'

					return buildModuleImportResult('insurance', {
						imported: 0,
						discovered: 0,
						errorMessage: message,
					})
				}
			}

			if (moduleId === 'vehicles') {
				setJourneyPhase('scanning')
				setJourneyPhasesCompleted(['assign', 'scanning'])
				setJourneyPhasesSucceeded(['assign'])

				try {
					const syncResult = await runVehicleImportSync(userId)

					setJourneyPhase('detection')
					setJourneyPhasesCompleted(['assign', 'scanning', 'detection'])
					setJourneyPhasesSucceeded(['assign', 'scanning', 'detection'])

					return buildModuleImportResult('vehicles', {
						imported: syncResult.imported,
						discovered: syncResult.discovered,
					})
				} catch (error) {
					const message =
						error instanceof Error ? error.message : 'Vehicle import failed'

					return buildModuleImportResult('vehicles', {
						imported: 0,
						discovered: 0,
						errorMessage: message,
					})
				}
			}

			return runHealthImportJourney(
				userId,
				[info.externalFolderId],
				({ phase, phasesCompleted, phasesSucceeded }) => {
					setJourneyPhase(phase)
					setJourneyPhasesCompleted(phasesCompleted)
					setJourneyPhasesSucceeded(phasesSucceeded)
				},
			)
		},
		[userId],
	)

	const startImportJourney = useCallback(
		async (info: AssignmentSuccessInfo, moduleId: FolderAssignmentModuleId) => {
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
				const result = await runModuleImportJourney(moduleId, info)

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
					phasesSucceeded: ['assign'],
				})
				setJourneyPhase('summary')
				setJourneyPhasesCompleted(['assign', 'scanning', 'summary'])
				setJourneyPhasesSucceeded(['assign'])
			} finally {
				setIsJourneyRunning(false)
			}
		},
		[onJourneyComplete, onRefresh, runModuleImportJourney, userId],
	)

	const assignModuleFolders = useCallback(
		async (
			moduleId: FolderAssignmentModuleId,
			memberIds: string[],
			mode: ExistingFolderMode,
		) => {
			switch (moduleId) {
				case 'insurance': {
					const discoveredCategories =
						discoverInsuranceCategoriesFromFolderNames(
							childFolderNames.length > 0 ? childFolderNames : [folderName],
						).map((category) => category.id)

					for (const memberId of memberIds) {
						await assignInsuranceSourceFolder({
							userId,
							externalFolderId: folderId,
							folderName,
							folderPath: folderName,
							familyMemberId: memberId,
							discoveredCategories,
							mode,
						})
					}
					return
				}
				case 'vehicles': {
					for (const memberId of memberIds) {
						await assignVehicleSourceFolder({
							userId,
							externalFolderId: folderId,
							folderName,
							folderPath: folderName,
							familyMemberId: memberId,
							mode,
						})
					}
					return
				}
				default:
					await assignHealthSourceFolders({
						userId,
						externalFolderId: folderId,
						folderName,
						familyMemberIds: memberIds,
						mode,
					})
			}
		},
		[childFolderNames, folderId, folderName, userId],
	)

	const performAssign = useCallback(
		async (memberIds: string[], mode: ExistingFolderMode = 'add') => {
			const moduleId = resolveActiveFolderAssignmentModule(
				moduleMode,
				folderName,
				moduleHints,
			)

			setActiveModuleId(moduleId)
			setIsSaving(true)
			setErrorMessage(null)

			try {
				await assignModuleFolders(moduleId, memberIds, mode)
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
				void startImportJourney(info, moduleId)
			} catch (error) {
				setErrorMessage(mapAssignmentError(error))
			} finally {
				setIsSaving(false)
			}
		},
		[
			assignModuleFolders,
			folderId,
			folderName,
			moduleHints,
			moduleMode,
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

		const moduleId = resolveActiveFolderAssignmentModule(
			moduleMode,
			folderName,
			moduleHints,
		)

		setSelectedMemberIds([suggestion.memberId])
		const hasExisting = await checkExistingAndProceed(
			[suggestion.memberId],
			moduleId,
		)

		if (!hasExisting) {
			await performAssign([suggestion.memberId], 'add')
		}
	}, [
		checkExistingAndProceed,
		folderName,
		moduleHints,
		moduleMode,
		performAssign,
		suggestion,
	])

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

		const moduleId = resolveActiveFolderAssignmentModule(
			moduleMode,
			folderName,
			moduleHints,
		)

		const hasExisting = await checkExistingAndProceed(
			selectedMemberIds,
			moduleId,
		)

		if (!hasExisting) {
			await performAssign(selectedMemberIds, 'add')
		}
	}, [
		checkExistingAndProceed,
		folderName,
		moduleHints,
		moduleMode,
		performAssign,
		selectedMemberIds,
	])

	const handleContinueExisting = useCallback(async () => {
		await performAssign(selectedMemberIds, existingMode)
	}, [existingMode, performAssign, selectedMemberIds])

	const handleRetryJourney = useCallback(() => {
		if (!successInfo) {
			return
		}

		journeyStartedRef.current = false

		void (async () => {
			if (activeModuleId === 'health') {
				await resetFailedImportCandidates(userId)
			}

			await startImportJourney(successInfo, activeModuleId)
		})()
	}, [activeModuleId, startImportJourney, successInfo, userId])

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
		activeModuleId,
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
