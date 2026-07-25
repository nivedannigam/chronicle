import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useHealthKnowledge } from '@/features/health-knowledge/hooks/useHealthKnowledge'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { useHealthImportStatus } from '@/features/health-import/hooks/useHealthImportStatus'
import {
	buildTimelineEvents,
	buildTimelinePreview,
} from '@/features/timeline/engine/timeline-engine'
import '@/features/timeline/providers/register-timeline-providers'
import type {
	TimelineFilters,
	TimelineSources,
} from '@/features/timeline/types/timeline.types'

function buildTimelineSources(input: {
	reports: ReturnType<typeof useMemberHealthReports>['data']
	documents: ReturnType<typeof useMemberDocuments>['data']
	metricHistories: ReturnType<
		typeof useHealthKnowledge
	>['graph']['profile']['metricHistories']
	importStatus: ReturnType<typeof useHealthImportStatus>['data']
}): TimelineSources {
	return {
		health: {
			uploadedReports: input.reports ?? [],
			metricHistories: input.metricHistories ?? [],
		},
		documents: {
			uploadedDocuments: input.documents ?? [],
		},
		system: {
			lastDriveScanAt: input.importStatus?.lastScanAt ?? null,
			medicalReportsCount: input.importStatus?.medicalReportsCount ?? 0,
		},
	}
}

export function useTimelineSources(): TimelineSources {
	const reportsQuery = useMemberHealthReports()
	const documentsQuery = useMemberDocuments()
	const { user } = useAuth()
	const { graph } = useHealthKnowledge(user?.id, reportsQuery.data ?? [])
	const importStatus = useHealthImportStatus(user?.id)

	return useMemo(
		() =>
			buildTimelineSources({
				reports: reportsQuery.data,
				documents: documentsQuery.data,
				metricHistories: graph.profile.metricHistories,
				importStatus: importStatus.data,
			}),
		[
			reportsQuery.data,
			documentsQuery.data,
			graph.profile.metricHistories,
			importStatus.data,
		],
	)
}

export function useTimelineEvents(filters: TimelineFilters = {}) {
	const { user } = useAuth()
	const { selectedMemberId, selectedMember } = useFamilyContext()
	const sources = useTimelineSources()

	return useMemo(
		() =>
			buildTimelineEvents({
				userId: user?.id ?? '',
				memberId: selectedMemberId,
				memberName: selectedMember?.displayName ?? null,
				sources,
				filters: {
					...filters,
					memberId: filters.memberId ?? selectedMemberId,
				},
			}),
		[user?.id, selectedMemberId, selectedMember?.displayName, sources, filters],
	)
}

export function useTimelinePreview(count = 5) {
	const { user } = useAuth()
	const { selectedMemberId, selectedMember } = useFamilyContext()
	const sources = useTimelineSources()

	return useMemo(
		() =>
			buildTimelinePreview(
				{
					userId: user?.id ?? '',
					memberId: selectedMemberId,
					memberName: selectedMember?.displayName ?? null,
					sources,
				},
				count,
			),
		[user?.id, selectedMemberId, selectedMember?.displayName, sources, count],
	)
}
