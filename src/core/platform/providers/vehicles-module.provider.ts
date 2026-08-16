import { ROUTES } from '@/constants/routes'
import type {
	ChronicleModuleProvider,
	ModuleDocumentSection,
	ModuleProviderQuery,
	ModuleSummary,
} from '@/core/platform/contracts/module-provider.contract'
import { toDocumentSummary } from '@/features/documents/services/document-intelligence.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { ChronicleDocumentSummary } from '@/features/documents/types/document-intelligence.types'
import { getVehicleDocumentTypeMeta } from '@/features/vehicle-knowledge/graph/vehicle-document-types'

function isVehicleLibraryDocument(document: ChronicleDocument): boolean {
	return document.category_id === 'vehicles'
}

function vehicleKnowledgeDocToSummary(
	document: {
		id: string
		fileName: string
		documentType: string
		uploadedAt: string
		isDisplayReady?: boolean
		expiryDate?: string | null
	},
	vehicleName: string,
	memberNames: Record<string, string>,
	memberId: string | null | undefined,
): ChronicleDocumentSummary {
	const meta = getVehicleDocumentTypeMeta(
		document.documentType as Parameters<typeof getVehicleDocumentTypeMeta>[0],
	)
	const expiry = document.expiryDate ? Date.parse(document.expiryDate) : NaN
	const isExpired = !Number.isNaN(expiry) && expiry < Date.now()
	const isExpiringSoon =
		!Number.isNaN(expiry) &&
		!isExpired &&
		expiry - Date.now() <= 1000 * 60 * 60 * 24 * 30

	return {
		id: document.id,
		title: document.fileName,
		categoryId: 'vehicles',
		categoryLabel: 'Vehicles',
		subCategoryLabel: meta.label,
		ownerLabel: memberId
			? (memberNames[memberId] ?? 'Family member')
			: 'Account owner',
		sourceLabel: 'Vehicles folder',
		summary: `${vehicleName} · ${meta.label}`,
		displayDate: new Date(document.uploadedAt).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		}),
		expiresLabel: document.expiryDate
			? new Date(document.expiryDate).toLocaleDateString('en-US', {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
				})
			: null,
		isExpiringSoon,
		isExpired,
		fileType: 'PDF',
		hasAiSummary: true,
		tags: ['vehicles', document.documentType],
		relatedModules: [
			{
				moduleId: 'vehicles',
				label: 'Vehicles',
				route: ROUTES.vehicles,
			},
		],
		consumerStatus: document.isDisplayReady ? 'Ready' : 'Still Organizing',
		aiDiscoveryLabel: null,
		year: new Date(document.uploadedAt).getFullYear(),
	}
}

export const vehiclesModuleProvider: ChronicleModuleProvider = {
	moduleId: 'vehicles',
	label: 'Vehicles',
	emoji: '🚗',
	priority: 12,

	getDocumentSection(query: ModuleProviderQuery): ModuleDocumentSection | null {
		const knowledge = query.sources.vehicles?.knowledge
		const memberNames = query.memberNames ?? {}
		const documents: ChronicleDocumentSummary[] = []
		const categoryCounts = new Map<string, number>()

		for (const document of knowledge?.documents ?? []) {
			const vehicle =
				knowledge?.vehicles.find((entry) => entry.id === document.vehicleId)
					?.displayName ?? 'Vehicle'

			documents.push(
				vehicleKnowledgeDocToSummary(
					document,
					vehicle,
					memberNames,
					knowledge?.familyMember.id,
				),
			)
			categoryCounts.set(
				document.documentType,
				(categoryCounts.get(document.documentType) ?? 0) + 1,
			)
		}

		for (const document of query.sources.documents?.uploadedDocuments ?? []) {
			if (!isVehicleLibraryDocument(document)) {
				continue
			}

			documents.push(toDocumentSummary(document, memberNames))
		}

		if (documents.length === 0) {
			return null
		}

		return {
			moduleId: 'vehicles',
			label: 'Vehicles',
			emoji: '🚗',
			totalCount: documents.length,
			categories: [...categoryCounts.entries()].map(([id, count]) => ({
				id,
				label: getVehicleDocumentTypeMeta(
					id as Parameters<typeof getVehicleDocumentTypeMeta>[0],
				).label,
				count,
			})),
			documents,
		}
	},

	getSummary(query: ModuleProviderQuery): ModuleSummary | null {
		const section = this.getDocumentSection(query)

		if (!section) {
			return null
		}

		return {
			moduleId: 'vehicles',
			label: 'Vehicles',
			emoji: '🚗',
			documentCount: section.totalCount,
			headline: query.sources.vehicles?.knowledge?.summary.headline ?? null,
		}
	},
}
