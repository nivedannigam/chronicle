import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useInsuranceImportStatus } from '@/features/insurance-import/hooks/useInsuranceImportStatus'
import { useInsuranceSources } from '@/features/insurance/hooks/useInsuranceSources'
import { getConnectorConnection } from '@/features/connectors/services/connector-store.service'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

export type InsuranceSetupStatus =
	| 'connect_drive'
	| 'assign_folder'
	| 'scanning'
	| 'processing'
	| 'partial'
	| 'ready'
	| 'empty_folder'

export interface InsuranceSetupState {
	driveConnected: boolean
	hasFolderAssigned: boolean
	hasDiscoveredDocuments: boolean
	hasPolicies: boolean
	isProcessing: boolean
	processingCount: number
	setupStatus: InsuranceSetupStatus
	isLoading: boolean
}

async function fetchDriveConnected(userId: string): Promise<boolean> {
	const connection = await getConnectorConnection(userId, 'google-drive')
	return connection?.status === 'connected'
}

export function useInsuranceMemberSetup(input?: {
	hasPolicies: boolean
	documentCount: number
}): InsuranceSetupState {
	const { user, session, isLoading: authLoading } = useAuth()
	const userId = user?.id
	const { selectedMemberId } = useFamilyContext()
	const sources = useInsuranceSources(userId)
	const importStatus = useInsuranceImportStatus(userId)

	const driveQuery = useQuery({
		queryKey: queryKeys.connectors.connection(userId, 'google-drive'),
		queryFn: () => fetchDriveConnected(userId!),
		enabled: Boolean(userId && session?.access_token) && !authLoading,
		staleTime: STALE_TIME.connectorConnection,
	})

	return useMemo(() => {
		const driveConnected = driveQuery.data ?? false
		const memberAssignments = selectedMemberId
			? sources.assignments.filter(
					(assignment) => assignment.familyMemberId === selectedMemberId,
				)
			: sources.assignments
		const hasFolderAssigned = memberAssignments.length > 0
		const processingCount = importStatus.data?.processingCount ?? 0
		const completedDocuments = importStatus.data?.completedDocumentCount ?? 0
		const hasDiscoveredDocuments =
			(input?.documentCount ?? 0) > 0 || completedDocuments > 0
		const hasPolicies = input?.hasPolicies ?? false
		const isProcessing =
			importStatus.data?.isScanning === true || processingCount > 0

		let setupStatus: InsuranceSetupStatus = 'connect_drive'

		if (!driveConnected) {
			setupStatus = 'connect_drive'
		} else if (!hasFolderAssigned) {
			setupStatus = 'assign_folder'
		} else if (isProcessing) {
			setupStatus = 'processing'
		} else if (hasPolicies) {
			setupStatus = 'ready'
		} else if (hasDiscoveredDocuments) {
			setupStatus = 'partial'
		} else if (importStatus.data?.lastRun?.status === 'completed') {
			setupStatus = 'empty_folder'
		} else {
			setupStatus = 'scanning'
		}

		return {
			driveConnected,
			hasFolderAssigned,
			hasDiscoveredDocuments,
			hasPolicies,
			isProcessing,
			processingCount,
			setupStatus,
			isLoading:
				sources.isLoading ||
				importStatus.isLoading ||
				driveQuery.isLoading ||
				authLoading,
		}
	}, [
		authLoading,
		driveQuery.data,
		driveQuery.isLoading,
		importStatus.data,
		importStatus.isLoading,
		input?.documentCount,
		input?.hasPolicies,
		selectedMemberId,
		sources.assignments,
		sources.isLoading,
	])
}
