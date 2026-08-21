import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useMemberDocuments } from '@/features/documents/hooks/useMemberDocuments'
import { useHealthKnowledge } from '@/features/health-knowledge/hooks/useHealthKnowledge'
import { useMemberHealthReports } from '@/features/health/hooks/useMemberHealthReports'
import { useHealthImportStatus } from '@/features/health-import/hooks/useHealthImportStatus'
import { useInsuranceKnowledge } from '@/features/insurance/hooks/useInsuranceKnowledge'
import { useFinanceKnowledge } from '@/features/finance/hooks/useFinanceKnowledge'
import { useFinanceSources } from '@/features/finance/hooks/useFinanceSources'
import { useIdentityKnowledge } from '@/features/identity/hooks/useIdentityKnowledge'
import { usePropertyKnowledge } from '@/features/property/hooks/usePropertyKnowledge'
import { usePropertySources } from '@/features/property/hooks/usePropertySources'
import { useVehicleKnowledge } from '@/features/vehicles/hooks/useVehicleKnowledge'
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
	insuranceKnowledge: ReturnType<typeof useInsuranceKnowledge>['knowledge']
	financeKnowledge: ReturnType<typeof useFinanceKnowledge>['knowledge']
	hasFinanceFolderAssigned: boolean
	vehicleKnowledge: ReturnType<typeof useVehicleKnowledge>['knowledge']
	identityKnowledge: ReturnType<typeof useIdentityKnowledge>['knowledge']
	propertyKnowledge: ReturnType<typeof usePropertyKnowledge>['knowledge']
	hasPropertyFolderAssigned: boolean
	propertyRootFolderPath: string | null
	userId?: string
	familyMemberId?: string | null
	accountOwnerMemberId?: string | null
}): TimelineSources {
	return {
		health: {
			uploadedReports: input.reports ?? [],
			metricHistories: input.metricHistories ?? [],
		},
		documents: {
			uploadedDocuments: input.documents ?? [],
		},
		insurance: input.insuranceKnowledge
			? {
					knowledge: input.insuranceKnowledge,
					userId: input.userId,
					familyMemberId: input.familyMemberId ?? null,
					accountOwnerMemberId: input.accountOwnerMemberId ?? null,
				}
			: undefined,
		finance: input.financeKnowledge
			? {
					knowledge: input.financeKnowledge,
					userId: input.userId,
					hasFolderAssigned: input.hasFinanceFolderAssigned,
					familyMemberId: input.familyMemberId ?? null,
				}
			: undefined,
		vehicles: input.vehicleKnowledge
			? {
					knowledge: input.vehicleKnowledge,
					userId: input.userId,
					familyMemberId: input.familyMemberId ?? null,
					accountOwnerMemberId: input.accountOwnerMemberId ?? null,
				}
			: undefined,
		identity: input.identityKnowledge
			? {
					knowledge: input.identityKnowledge,
					userId: input.userId,
					familyMemberId: input.familyMemberId ?? null,
					accountOwnerMemberId: input.accountOwnerMemberId ?? null,
				}
			: undefined,
		property: input.propertyKnowledge
			? {
					knowledge: input.propertyKnowledge,
					userId: input.userId,
					hasFolderAssigned: input.hasPropertyFolderAssigned,
					rootFolderPath: input.propertyRootFolderPath,
					familyMemberId: input.familyMemberId ?? null,
				}
			: undefined,
		system: {
			lastDriveScanAt: input.importStatus?.lastScanAt ?? null,
			medicalReportsCount: input.importStatus?.medicalReportsCount ?? 0,
		},
	}
}

export function useTimelineSources(): {
	sources: TimelineSources
	isLoading: boolean
	isError: boolean
	refetch: () => void
} {
	const reportsQuery = useMemberHealthReports()
	const documentsQuery = useMemberDocuments()
	const { user } = useAuth()
	const { selectedMemberId, accountOwnerMemberId } = useFamilyContext()
	const { graph } = useHealthKnowledge(user?.id, reportsQuery.data ?? [])
	const importStatus = useHealthImportStatus(user?.id)
	const insuranceQuery = useInsuranceKnowledge()
	const financeSources = useFinanceSources(user?.id)
	const financeQuery = useFinanceKnowledge({
		hasFolderAssigned: financeSources.hasFolderAssigned,
	})
	const vehicleQuery = useVehicleKnowledge()
	const identityQuery = useIdentityKnowledge()
	const propertySources = usePropertySources(user?.id)
	const propertyQuery = usePropertyKnowledge({
		hasFolderAssigned: propertySources.hasFolderAssigned,
		rootFolderPath: propertySources.rootFolderPath,
	})

	const sources = useMemo(
		() =>
			buildTimelineSources({
				reports: reportsQuery.data,
				documents: documentsQuery.data,
				metricHistories: graph.profile.metricHistories,
				importStatus: importStatus.data,
				insuranceKnowledge: insuranceQuery.knowledge,
				financeKnowledge: financeQuery.knowledge,
				hasFinanceFolderAssigned: financeSources.hasFolderAssigned,
				vehicleKnowledge: vehicleQuery.knowledge,
				identityKnowledge: identityQuery.knowledge,
				propertyKnowledge: propertyQuery.knowledge,
				hasPropertyFolderAssigned: propertySources.hasFolderAssigned,
				propertyRootFolderPath: propertySources.rootFolderPath,
				userId: user?.id,
				familyMemberId: selectedMemberId,
				accountOwnerMemberId,
			}),
		[
			reportsQuery.data,
			documentsQuery.data,
			graph.profile.metricHistories,
			importStatus.data,
			insuranceQuery.knowledge,
			financeQuery.knowledge,
			financeSources.hasFolderAssigned,
			vehicleQuery.knowledge,
			identityQuery.knowledge,
			propertyQuery.knowledge,
			propertySources.hasFolderAssigned,
			propertySources.rootFolderPath,
			user?.id,
			selectedMemberId,
			accountOwnerMemberId,
		],
	)

	const isLoading =
		reportsQuery.isLoading ||
		documentsQuery.isLoading ||
		importStatus.isLoading ||
		insuranceQuery.isLoading ||
		financeQuery.isLoading ||
		financeSources.isLoading ||
		vehicleQuery.isLoading ||
		identityQuery.isLoading ||
		propertyQuery.isLoading ||
		propertySources.isLoading

	const isError =
		reportsQuery.isError || documentsQuery.isError || importStatus.isError

	const refetch = () => {
		void reportsQuery.refetch()
		void documentsQuery.refetch()
		void importStatus.refetch()
	}

	return { sources, isLoading, isError, refetch }
}

export function useTimelineEvents(filters: TimelineFilters = {}) {
	const { user } = useAuth()
	const { selectedMemberId, selectedMember, accountOwnerMemberId } =
		useFamilyContext()
	const { sources, isLoading, isError, refetch } = useTimelineSources()

	const timeline = useMemo(
		() =>
			buildTimelineEvents({
				userId: user?.id ?? '',
				memberId: selectedMemberId,
				memberName: selectedMember?.displayName ?? null,
				sources,
				filters: {
					...filters,
					memberId: filters.memberId ?? selectedMemberId,
					accountOwnerMemberId,
				},
			}),
		[
			user?.id,
			selectedMemberId,
			selectedMember?.displayName,
			accountOwnerMemberId,
			sources,
			filters,
		],
	)

	return { ...timeline, isLoading, isError, refetch }
}

export function useTimelinePreview(count = 5) {
	const { user } = useAuth()
	const { selectedMemberId, selectedMember } = useFamilyContext()
	const { sources } = useTimelineSources()

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
