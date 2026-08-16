import { registerModuleProviders } from '@/core/platform/bootstrap/register-module-providers'
import type {
	FederatedLibraryView,
	ModuleProviderQuery,
} from '@/core/platform/contracts/module-provider.contract'
import { getRegisteredModuleProviders } from '@/core/platform/registries/module-provider-registry'
import { buildAttentionItems } from '@/features/documents/services/document-intelligence.service'
import type {
	ChronicleDocumentSummary,
	DocumentAttentionItem,
	DocumentsHubView,
} from '@/features/documents/types/document-intelligence.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import type { UploadedHealthReport } from '@/features/health/types'

function ensureModuleProvidersRegistered(): void {
	registerModuleProviders()
}

function dedupeDocuments(
	documents: ChronicleDocumentSummary[],
): ChronicleDocumentSummary[] {
	const seen = new Set<string>()
	const deduped: ChronicleDocumentSummary[] = []

	for (const document of documents) {
		if (seen.has(document.id)) {
			continue
		}

		seen.add(document.id)
		deduped.push(document)
	}

	return deduped
}

/** Aggregates documents from all registered module providers — no duplicate indexing. */
export function buildFederatedLibraryView(
	query: ModuleProviderQuery,
): FederatedLibraryView {
	ensureModuleProvidersRegistered()

	const sections = getRegisteredModuleProviders()
		.map((provider) => provider.getDocumentSection(query))
		.filter((section) => section != null)

	const allDocuments = dedupeDocuments(
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

function resolveInsuranceDocumentCount(query: ModuleProviderQuery): number {
	ensureModuleProvidersRegistered()
	return (
		getRegisteredModuleProviders()
			.find((provider) => provider.moduleId === 'insurance')
			?.getSummary?.(query)?.documentCount ?? 0
	)
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
			totalCount: Math.max(
				federated.totalCount,
				Object.values(categoryCounts).reduce((sum, count) => sum + count, 0),
			),
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
	healthReports: UploadedHealthReport[]
	chronicleDocuments: ChronicleDocument[]
	insuranceKnowledge: InsuranceKnowledge | null
	vehicleKnowledge?: VehicleKnowledge | null
}): ModuleProviderQuery {
	return {
		userId: input.userId,
		memberId: input.memberId ?? null,
		memberNames: input.memberNames,
		sources: {
			health: { uploadedReports: input.healthReports },
			documents: { uploadedDocuments: input.chronicleDocuments },
			insurance: { knowledge: input.insuranceKnowledge },
			vehicles: { knowledge: input.vehicleKnowledge ?? null },
		},
	}
}

export function resolveModuleLibraryDocumentCount(input: {
	moduleId: 'health' | 'insurance' | 'vehicles' | 'documents'
	query: ModuleProviderQuery
}): number {
	ensureModuleProvidersRegistered()

	if (input.moduleId === 'insurance') {
		return resolveInsuranceDocumentCount(input.query)
	}

	if (input.moduleId === 'vehicles') {
		return (
			getRegisteredModuleProviders()
				.find((provider) => provider.moduleId === 'vehicles')
				?.getSummary?.(input.query)?.documentCount ?? 0
		)
	}

	const section = getRegisteredModuleProviders()
		.find((provider) => provider.moduleId === input.moduleId)
		?.getDocumentSection(input.query)

	return section?.totalCount ?? 0
}
