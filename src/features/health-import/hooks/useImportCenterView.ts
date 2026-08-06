import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useFamilyMembers } from '@/features/family/hooks/useFamilyMembers'
import { formatMemberLabel } from '@/features/family/services/folder-match.service'
import { dedupeFamilyMembers } from '@/features/family/utils/dedupe-family-members'
import { useHealthImport } from '@/features/health-import/hooks/useHealthImport'
import {
	buildImportCenterViewModel,
	type ImportCenterViewModel,
} from '@/features/health-import/services/import-center.mapper'
import { buildSetupReportRows } from '@/features/health-import/utils/setup-report-list.utils'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { buildHealthVisits } from '@/features/health/services/health-visit.mapper'
import { reprocessHealthReportWithAi } from '@/features/health/services/health-processing.service'
import { retryHealthDocument } from '@/features/health/workflow/health-workflow-retry.service'
import { useImportReview } from '@/features/medical-discovery/hooks/useImportReview'
import { useUser } from '@/features/user/hooks/useUser'
import { invalidateAfterHealthImport } from '@/lib/query-invalidation'
import { queryClient } from '@/lib/query-client'
import { uploadedHealthReportsQueryKey } from '@/features/health/hooks/useUploadedHealthReports'
import { ROUTES } from '@/constants/routes'

export function useImportCenterView(userId: string | undefined) {
	const navigate = useNavigate()
	const { selectedMemberId, accountOwnerMemberId } = useFamilyContext()
	const importState = useHealthImport(userId)
	const { data: reports = [] } = useMemberHealthReports()
	const review = useImportReview(userId)
	const { profile } = useUser()
	const { members } = useFamilyMembers(userId, profile?.name ?? 'Me')
	const [busyItemId, setBusyItemId] = useState<string | null>(null)

	const memberOptions = useMemo(
		() =>
			dedupeFamilyMembers(members).map((member) => ({
				id: member.id,
				label: formatMemberLabel(member),
			})),
		[members],
	)

	const view = useMemo<ImportCenterViewModel>(() => {
		const setupRows = buildSetupReportRows({
			registry: importState.registry,
			reports,
			memberId: selectedMemberId,
			accountOwnerMemberId,
		})

		return buildImportCenterViewModel({
			visits: buildHealthVisits(reports),
			setupRows,
			reviewDocuments: review.documents,
			memberOptions,
		})
	}, [
		importState.registry,
		reports,
		selectedMemberId,
		accountOwnerMemberId,
		review.documents,
		memberOptions,
	])

	const refreshAll = async () => {
		if (!userId) {
			return
		}

		await Promise.all([
			importState.refresh(),
			review.refresh(),
			queryClient.invalidateQueries({
				queryKey: uploadedHealthReportsQueryKey(userId),
			}),
			invalidateAfterHealthImport(userId),
		])
	}

	const handleKeep = async (registryId: string | null) => {
		if (!registryId) {
			return
		}

		setBusyItemId(registryId)

		try {
			await review.approve(registryId)
			await refreshAll()
		} finally {
			setBusyItemId(null)
		}
	}

	const handleIgnore = async (registryId: string | null) => {
		if (!registryId) {
			return
		}

		setBusyItemId(registryId)

		try {
			await review.reject(registryId)
			await refreshAll()
		} finally {
			setBusyItemId(null)
		}
	}

	const handleChooseMember = async (
		registryId: string | null,
		memberId: string,
	) => {
		if (!registryId) {
			return
		}

		setBusyItemId(registryId)

		try {
			await review.reassign(registryId, memberId)
			await review.approve(registryId)
			await refreshAll()
		} finally {
			setBusyItemId(null)
		}
	}

	const handleTryAgain = async (input: {
		registryId: string | null
		reportId: string | null
		itemId: string
	}) => {
		setBusyItemId(input.itemId)

		try {
			if (input.registryId || input.reportId) {
				if (!userId) {
					throw new Error('You must be signed in.')
				}

				await retryHealthDocument(userId, {
					registryId: input.registryId,
					reportId: input.reportId,
				})
			} else {
				await importState.retry()
			}

			await refreshAll()
		} finally {
			setBusyItemId(null)
		}
	}

	const handleReprocessWithAi = async (input: {
		reportId: string
		itemId: string
	}) => {
		setBusyItemId(input.itemId)

		try {
			await reprocessHealthReportWithAi(input.reportId)
			await refreshAll()
		} finally {
			setBusyItemId(null)
		}
	}

	const handleMove = () => {
		navigate(ROUTES.healthFolderSetup)
	}

	return {
		view,
		isLoading: review.isLoading || importState.isLoading,
		busyItemId,
		handleKeep,
		handleIgnore,
		handleChooseMember,
		handleTryAgain,
		handleReprocessWithAi,
		handleMove,
	}
}
