import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useHealthSources } from '@/features/family/hooks/useHealthSources'
import { useHealthImportStatus } from '@/features/health-import/hooks/useHealthImportStatus'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import {
	countDisplayReadyReports,
	countProcessingReports,
	countReportsNeedingReprocess,
} from '@/features/health/services/report-readiness.service'
import { getConnectorConnection } from '@/features/connectors/services/connector-store.service'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export type HealthSetupStep =
	'connect_drive' | 'assign_folder' | 'scan_import' | 'review_imports' | 'ready'

export interface HealthSetupState {
	driveConnected: boolean
	hasFolderForMember: boolean
	needsReview: number
	hasCompletedReports: boolean
	reportsNeedingReprocess: number
	processingReportsCount: number
	currentStep: HealthSetupStep
	memberAssignments: Array<{ folderName: string; externalFolderId: string }>
	isLoading: boolean
}

async function fetchDriveConnected(userId: string): Promise<boolean> {
	const connection = await getConnectorConnection(userId, 'google-drive')
	return connection?.status === 'connected'
}

export function useHealthMemberSetup() {
	const { user, session, isLoading: authLoading } = useAuth()
	const userId = user?.id
	const { selectedMemberId } = useFamilyContext()
	const importStatus = useHealthImportStatus(userId)
	const sources = useHealthSources(userId)
	const memberReports = useMemberHealthReports()

	const driveQuery = useQuery({
		queryKey: queryKeys.connectors.connection(userId, 'google-drive'),
		queryFn: () => fetchDriveConnected(userId!),
		enabled: Boolean(userId && session?.access_token) && !authLoading,
		staleTime: STALE_TIME.connectorConnection,
	})

	const memberAssignments = useMemo(() => {
		if (!selectedMemberId) {
			return []
		}

		return sources.assignments
			.filter((assignment) => assignment.familyMemberId === selectedMemberId)
			.map((assignment) => ({
				folderName: assignment.folderName,
				externalFolderId: assignment.externalFolderId,
			}))
	}, [sources.assignments, selectedMemberId])

	const state = useMemo<HealthSetupState>(() => {
		const driveConnected = driveQuery.data ?? false
		const hasFolderForMember = memberAssignments.length > 0
		const needsReview = importStatus.data?.needsReviewCount ?? 0
		const reports = memberReports.data ?? []
		const hasCompletedReports = countDisplayReadyReports(reports) > 0
		const reportsNeedingReprocess = countReportsNeedingReprocess(reports)
		const processingReportsCount = countProcessingReports(reports)

		let currentStep: HealthSetupStep = 'connect_drive'

		if (driveConnected && !hasFolderForMember) {
			currentStep = 'assign_folder'
		} else if (driveConnected && hasFolderForMember && needsReview > 0) {
			currentStep = 'review_imports'
		} else if (hasCompletedReports) {
			currentStep = 'ready'
		} else if (driveConnected && hasFolderForMember) {
			currentStep = 'scan_import'
		}

		return {
			driveConnected,
			hasFolderForMember,
			needsReview,
			hasCompletedReports,
			reportsNeedingReprocess,
			processingReportsCount,
			currentStep,
			memberAssignments,
			isLoading:
				driveQuery.isLoading ||
				sources.isLoading ||
				importStatus.isLoading ||
				memberReports.isLoading,
		}
	}, [
		driveQuery.data,
		driveQuery.isLoading,
		memberAssignments,
		importStatus.data,
		importStatus.isLoading,
		memberReports.data,
		memberReports.isLoading,
		sources.isLoading,
	])

	return {
		...state,
		importStatus: importStatus.data,
		refetch: async () => {
			await Promise.all([
				driveQuery.refetch(),
				sources.refresh(),
				importStatus.refetch(),
				memberReports.refetch(),
			])
		},
	}
}
