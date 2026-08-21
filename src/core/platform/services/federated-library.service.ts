import { registerModuleProviders } from '@/core/platform/bootstrap/register-module-providers'
import type {
	FederatedLibraryView,
	ModuleProviderQuery,
} from '@/core/platform/contracts/module-provider.contract'
import type { PlatformModuleId } from '@/core/platform/contracts/platform-module.contract'
import { dedupeLibrarySummaries } from '@/core/platform/providers/module-document-provider.utils'
import { getRegisteredModuleProviders } from '@/core/platform/registries/module-provider-registry'
import { buildAttentionItems } from '@/features/documents/services/document-intelligence.service'
import type {
	ChronicleDocumentSummary,
	DocumentAttentionItem,
	DocumentsHubView,
} from '@/features/documents/types/document-intelligence.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { FinanceKnowledge } from '@/features/finance-knowledge/types/finance-knowledge.types'
import type { IdentityKnowledge } from '@/features/identity-knowledge/types/identity-knowledge.types'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { PropertyKnowledge } from '@/features/property-knowledge/types/property-knowledge.types'
import type { UploadedHealthReport } from '@/features/health/types'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'

function ensureModuleProvidersRegistered(): void {
	registerModuleProviders()
}

/** Aggregates documents from all registered module providers — no duplicate indexing. */
export function buildFederatedLibraryView(
	query: ModuleProviderQuery,
): FederatedLibraryView {
	ensureModuleProvidersRegistered()

	const sections = getRegisteredModuleProviders()
		.map((provider) => provider.getDocumentSection(query))
		.filter((section) => section != null)

	const allDocuments = dedupeLibrarySummaries(
		sections.flatMap((section) => section.documents),
	)

	const moduleSummaries = getRegisteredModuleProviders()
		.map((provider) => provider.getSummary?.(query))
		.filter((summary) => summary != null)

	return {
		sections,
		allDocuments,
		totalCount: allDocuments.length,
		moduleSummaries,
	}
}

function buildCategoryCounts(
	federated: FederatedLibraryView,
): Record<string, number> {
	const counts: Record<string, number> = {}

	for (const summary of federated.allDocuments) {
		counts[summary.categoryId] = (counts[summary.categoryId] ?? 0) + 1
	}

	return counts
}

/** Library hub — federated module documents are the source of truth for counts and lists. */
export function buildLibraryHubView(input: {
	query: ModuleProviderQuery
	/** Raw chronicle rows for attention / expiry metadata on library-owned docs. */
	chronicleDocuments: ChronicleDocument[]
}): { hub: DocumentsHubView; federated: FederatedLibraryView } {
	const federated = buildFederatedLibraryView(input.query)
	const chronicleSummaries = input.chronicleDocuments
		.filter((document) => document.status !== 'failed')
		.map((document) =>
			federated.allDocuments.find((summary) => summary.id === document.id),
		)
		.filter((summary): summary is ChronicleDocumentSummary => summary != null)

	const categoryCounts = buildCategoryCounts(federated)

	const expiringSoon = federated.allDocuments.filter(
		(summary) => summary.isExpiringSoon,
	)
	const needsAttention = federated.allDocuments.filter(
		(summary) =>
			summary.isExpired ||
			summary.consumerStatus === 'Needs Help' ||
			summary.consumerStatus === 'Still Organizing',
	)

	const recentlyAdded = [...federated.allDocuments]
		.sort(
			(left, right) =>
				Date.parse(right.displayDate) - Date.parse(left.displayDate),
		)
		.slice(0, 4)

	const attention = buildAttentionItems(
		input.chronicleDocuments.filter((document) => document.status !== 'failed'),
	)

	return {
		federated,
		hub: {
			totalCount: federated.totalCount,
			attentionCount: attention.filter(
				(item: DocumentAttentionItem) => item.severity !== 'low',
			).length,
			expiringCount: expiringSoon.length,
			categoryCounts,
			attention,
			recentlyAdded,
			recentActivity: [],
			allDocuments: federated.allDocuments,
			expiringSoon,
			aiDiscoveries: chronicleSummaries
				.filter((summary) => summary.aiDiscoveryLabel)
				.slice(0, 4)
				.map((summary) => ({
					id: `discovery-${summary.id}`,
					documentId: summary.id,
					title: summary.title,
					label: summary.aiDiscoveryLabel ?? '',
					categoryLabel: summary.categoryLabel,
				})),
			needsAttention,
		},
	}
}

export function buildModuleProviderQuery(input: {
	userId: string
	memberId?: string | null
	memberNames: Record<string, string>
	accountOwnerMemberId?: string | null
	healthReports: UploadedHealthReport[]
	chronicleDocuments: ChronicleDocument[]
	insuranceKnowledge: InsuranceKnowledge | null
	vehicleKnowledge?: VehicleKnowledge | null
	identityKnowledge?: IdentityKnowledge | null
	financeKnowledge?: FinanceKnowledge | null
	propertyKnowledge?: PropertyKnowledge | null
	propertyFolderAssigned?: boolean
	propertyRootFolderPath?: string | null
}): ModuleProviderQuery {
	return {
		userId: input.userId,
		memberId: input.memberId ?? null,
		memberNames: input.memberNames,
		accountOwnerMemberId: input.accountOwnerMemberId ?? null,
		sources: {
			health: { uploadedReports: input.healthReports },
			documents: { uploadedDocuments: input.chronicleDocuments },
			insurance: { knowledge: input.insuranceKnowledge },
			vehicles: { knowledge: input.vehicleKnowledge ?? null },
			identity: { knowledge: input.identityKnowledge ?? null },
			finance: { knowledge: input.financeKnowledge ?? null },
			property: {
				knowledge: input.propertyKnowledge ?? null,
				hasFolderAssigned: input.propertyFolderAssigned ?? false,
				rootFolderPath: input.propertyRootFolderPath ?? null,
			},
		},
	}
}

export function resolveModuleLibraryDocumentCount(input: {
	moduleId: PlatformModuleId | 'documents'
	query: ModuleProviderQuery
}): number {
	ensureModuleProvidersRegistered()

	const provider = getRegisteredModuleProviders().find(
		(entry) => entry.moduleId === input.moduleId,
	)

	return provider?.getSummary?.(input.query)?.documentCount ?? 0
}
