import { useMemo } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useDocuments } from '@/features/documents/hooks/useDocuments'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import { useHealthImportStatus } from '@/features/health-import/hooks/useHealthImportStatus'
import { useHealthKnowledge } from '@/features/health-knowledge/hooks/useHealthKnowledge'
import { useHealthMemberSetup } from '@/features/health/hooks/useHealthMemberSetup'
import { useUploadedHealthReports } from '@/features/health/hooks/useUploadedHealthReports'
import { buildHealthCompanionView } from '@/features/health/services/health-companion.service'
import {
	buildCanonicalHealthScore,
	deriveConsumerOverallStatus,
} from '@/features/health/services/health-consumer-status.service'
import { countProcessingReports } from '@/features/health/services/report-readiness.service'
import { useFinanceKnowledge } from '@/features/finance/hooks/useFinanceKnowledge'
import { useFinanceSources } from '@/features/finance/hooks/useFinanceSources'
import { usePropertySources } from '@/features/property/hooks/usePropertySources'
import { buildFinanceContextValue } from '@/features/finance/services/finance-context.builder'
import { buildFinanceKnowledge } from '@/features/finance-knowledge'
import {
	buildPropertyKnowledge,
	filterPropertyKnowledgeForMember,
} from '@/features/property-knowledge'
import { useIdentityKnowledge } from '@/features/identity/hooks/useIdentityKnowledge'
import { useIdentitySources } from '@/features/identity/hooks/useIdentitySources'
import { buildIdentityContextValue } from '@/features/identity/services/identity-context.builder'
import { buildIdentityKnowledge } from '@/features/identity-knowledge'
import { useInsuranceKnowledge } from '@/features/insurance/hooks/useInsuranceKnowledge'
import { useInsuranceMemberSetup } from '@/features/insurance/hooks/useInsuranceMemberSetup'
import {
	buildFinanceHubCard,
	buildHealthHubCard,
	buildIdentityHubCard,
	buildInsuranceHubCard,
	buildPersonalHubCard,
	buildPropertyHubCard,
	buildVehiclesHubCard,
} from '@/features/modules/services/module-hub-status.service'
import type { ModuleHubCardViewModel } from '@/features/modules/types/module-hub.types'
import { useVehicleKnowledge } from '@/features/vehicles/hooks/useVehicleKnowledge'
import { useVehicleSources } from '@/features/vehicles/hooks/useVehicleSources'

export function useModuleHubCards(): {
	cards: ModuleHubCardViewModel[]
	primaryCards: ModuleHubCardViewModel[]
	secondaryCards: ModuleHubCardViewModel[]
	isLoading: boolean
} {
	const { user } = useAuth()
	const userId = user?.id
	const { members, accountOwnerMemberId, selectedMemberId } = useFamilyContext()
	const documentsQuery = useDocuments()

	const reportsQuery = useUploadedHealthReports(userId)
	const healthSetup = useHealthMemberSetup()
	const healthImportStatus = useHealthImportStatus(userId)
	const reports = useMemo(() => reportsQuery.data ?? [], [reportsQuery.data])
	const { graph } = useHealthKnowledge(userId, reports)

	const insuranceQuery = useInsuranceKnowledge()
	const insuranceSetup = useInsuranceMemberSetup({
		hasPolicies: (insuranceQuery.knowledge?.summary.policyCount ?? 0) > 0,
		documentCount: insuranceQuery.knowledge?.documents.length ?? 0,
	})
	const vehicleQuery = useVehicleKnowledge()
	const vehicleSources = useVehicleSources(userId)

	const identityQuery = useIdentityKnowledge()
	const identitySources = useIdentitySources(userId)
	const financeQuery = useFinanceKnowledge()
	const financeSources = useFinanceSources(userId)
	const propertySources = usePropertySources(userId)

	const cards = useMemo(() => {
		const companion = buildHealthCompanionView({
			graph,
			uploadedReports: reports,
			insights: [],
			needsReview: healthSetup.needsReview,
			trendSeries: [],
			personId: userId,
			coverage: null,
		})
		const healthScore = buildCanonicalHealthScore(graph)
		const overallStatus = deriveConsumerOverallStatus({
			companion,
			score: healthScore,
		})
		const healthOrganizing =
			countProcessingReports(reports) > 0 ||
			(healthImportStatus.data?.processingCount ?? 0) > 0

		const identityKnowledge =
			identityQuery.knowledge ??
			buildIdentityKnowledge({
				userId: userId ?? '',
				documents: [],
				members,
				accountOwnerMemberId,
			})
		const identityContext = buildIdentityContextValue({
			knowledge: identityKnowledge,
			hasFolderAssigned: identitySources.hasFolderAssigned,
			isLoading: identityQuery.isLoading || identitySources.isLoading,
			isError: identityQuery.isError,
			refetch: identityQuery.refetch,
		})

		const financeKnowledge =
			financeQuery.knowledge ??
			buildFinanceKnowledge({
				userId: userId ?? '',
				documents: [],
				members,
				hasFolderAssigned: financeSources.hasFolderAssigned,
			})
		const financeContext = buildFinanceContextValue({
			knowledge: financeKnowledge,
			hasFolderAssigned: financeSources.hasFolderAssigned,
			isLoading: financeQuery.isLoading || financeSources.isLoading,
			isError: financeQuery.isError,
			refetch: financeQuery.refetch,
		})

		const personalCount = (documentsQuery.data ?? []).filter(
			(document) => document.category_id === 'personal',
		).length
		const propertyKnowledge = filterPropertyKnowledgeForMember(
			buildPropertyKnowledge({
				userId: userId ?? '',
				documents: documentsQuery.data ?? [],
				members,
				hasFolderAssigned: propertySources.hasFolderAssigned,
				rootFolderPath: propertySources.rootFolderPath,
				selectedMemberId,
			}),
			selectedMemberId,
		)

		return [
			buildHealthHubCard({
				overallStatus,
				hasReports: reports.length > 0,
				isOrganizing: healthOrganizing,
				hasFolderForMember: healthSetup.hasFolderForMember,
				driveConnected: healthSetup.driveConnected,
			}),
			buildInsuranceHubCard({
				knowledge: insuranceQuery.knowledge,
				setupStatus: insuranceSetup.setupStatus,
			}),
			buildVehiclesHubCard({
				knowledge: vehicleQuery.knowledge,
				hasFolderAssigned: vehicleSources.assignments.length > 0,
				isProcessing: (vehicleQuery.knowledge?.documents ?? []).some(
					(document) => !document.isDisplayReady,
				),
			}),
			buildIdentityHubCard({
				setupStatus: identityContext.setupStatus,
				attentionCount: identityContext.home.attentionItems.length,
				statusHeadline: identityContext.home.statusHeadline,
			}),
			buildFinanceHubCard({
				setupStatus: financeContext.setupStatus,
				documentCount: financeContext.knowledge.documentCount,
				attentionCount: financeContext.home.attentionItems.length,
				statusHeadline: financeContext.home.statusHeadline,
			}),
			buildPropertyHubCard({
				setupStatus: propertyKnowledge.setupStatus,
				documentCount: propertyKnowledge.summary.documentCount,
				propertyCount: propertyKnowledge.summary.propertyCount,
				attentionCount: propertyKnowledge.attention.length,
				statusHeadline: propertyKnowledge.summary.headline,
			}),
			buildPersonalHubCard({ documentCount: personalCount }),
		]
	}, [
		graph,
		reports,
		healthSetup.needsReview,
		healthSetup.hasFolderForMember,
		healthSetup.driveConnected,
		healthImportStatus.data?.processingCount,
		insuranceQuery.knowledge,
		insuranceSetup.setupStatus,
		vehicleQuery.knowledge,
		vehicleSources.assignments,
		identityQuery.knowledge,
		identityQuery.isLoading,
		identityQuery.isError,
		identityQuery.refetch,
		identitySources.hasFolderAssigned,
		identitySources.isLoading,
		financeQuery.knowledge,
		financeQuery.isLoading,
		financeQuery.isError,
		financeQuery.refetch,
		financeSources.hasFolderAssigned,
		financeSources.isLoading,
		propertySources.hasFolderAssigned,
		propertySources.isLoading,
		members,
		accountOwnerMemberId,
		selectedMemberId,
		userId,
		documentsQuery.data,
	])

	const primaryCards = cards.filter((card) =>
		['health', 'insurance', 'vehicles', 'identity'].includes(card.id),
	)
	const secondaryCards = cards.filter((card) =>
		['personal', 'finance', 'property'].includes(card.id),
	)

	const isLoading =
		reportsQuery.isLoading ||
		healthSetup.isLoading ||
		insuranceQuery.isLoading ||
		insuranceSetup.isLoading ||
		vehicleQuery.isLoading ||
		vehicleSources.isLoading ||
		identityQuery.isLoading ||
		identitySources.isLoading ||
		financeQuery.isLoading ||
		financeSources.isLoading ||
		documentsQuery.isLoading

	return {
		cards,
		primaryCards,
		secondaryCards,
		isLoading,
	}
}
