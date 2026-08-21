import { ROUTES } from '@/constants/routes'
import type {
	ChronicleModuleProvider,
	ModuleDocumentSection,
	ModuleProviderQuery,
	ModuleSummary,
} from '@/core/platform/contracts/module-provider.contract'
import {
	buildLibraryStableKey,
	formatLibraryDisplayDate,
	matchesLibraryMember,
	resolveOwnerLabel,
	toModuleLibrarySummary,
} from '@/core/platform/providers/module-document-provider.utils'
import { toDocumentSummary } from '@/features/documents/services/document-intelligence.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { ChronicleDocumentSummary } from '@/features/documents/types/document-intelligence.types'
import { getVehicleDocumentTypeMeta } from '@/features/vehicle-knowledge/graph/vehicle-document-types'

function isVehicleLibraryDocument(document: ChronicleDocument): boolean {
	return document.category_id === 'vehicles' && document.status !== 'failed'
}

function vehicleKnowledgeDocToSummary(
	document: {
		id: string
		fileName: string
		documentType: string
		uploadedAt: string
		isDisplayReady?: boolean
		expiryDate?: string | null
		vehicleId: string
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

	return toModuleLibrarySummary({
		canonicalId: document.id,
		moduleId: 'vehicles',
		categoryId: 'vehicles',
		categoryLabel: 'Vehicles',
		title: document.fileName,
		documentType: meta.label,
		sourceLabel: 'Vehicles folder',
		displayDate: formatLibraryDisplayDate(document.uploadedAt),
		summary: `${vehicleName} · ${meta.label}`,
		familyMemberId: memberId ?? null,
		ownerLabel: resolveOwnerLabel(memberNames, memberId),
		moduleDetailPath: ROUTES.vehicles,
		moduleDetailLabel: 'View in Vehicles',
		sourceKey: buildLibraryStableKey('vehicles', document.id),
		expiresLabel: document.expiryDate
			? formatLibraryDisplayDate(document.expiryDate)
			: null,
		isExpiringSoon,
		isExpired,
		hasAiSummary: true,
		tags: ['vehicles', document.documentType],
		consumerStatus: document.isDisplayReady ? 'Ready' : 'Still Organizing',
		year: new Date(document.uploadedAt).getFullYear(),
	})
}

export const vehiclesModuleProvider: ChronicleModuleProvider = {
	moduleId: 'vehicles',
	label: 'Vehicles',
	emoji: '🚗',
	priority: 12,

	getDocumentSection(query: ModuleProviderQuery): ModuleDocumentSection | null {
		const knowledge = query.sources.vehicles?.knowledge
		const memberNames = query.memberNames ?? {}
		const scope = {
			memberId: query.memberId,
			accountOwnerMemberId: query.accountOwnerMemberId,
		}
		const familyMemberId = knowledge?.familyMember.id
		const documents: ChronicleDocumentSummary[] = []
		const seen = new Set<string>()
		const categoryCounts = new Map<string, number>()

		if (!matchesLibraryMember(familyMemberId, scope) && scope.memberId) {
			return null
		}

		for (const document of knowledge?.documents ?? []) {
			const vehicle =
				knowledge?.vehicles.find((entry) => entry.id === document.vehicleId)
					?.displayName ?? 'Vehicle'

			const summary = vehicleKnowledgeDocToSummary(
				document,
				vehicle,
				memberNames,
				familyMemberId,
			)
			const key = summary.sourceKey ?? summary.id

			if (seen.has(key)) {
				continue
			}

			seen.add(key)
			documents.push(summary)
			categoryCounts.set(
				document.documentType,
				(categoryCounts.get(document.documentType) ?? 0) + 1,
			)
		}

		for (const document of query.sources.documents?.uploadedDocuments ?? []) {
			if (!isVehicleLibraryDocument(document)) {
				continue
			}

			if (!matchesLibraryMember(document.family_member_id, scope)) {
				continue
			}

			const key = buildLibraryStableKey('vehicles', document.id)

			if (seen.has(key)) {
				continue
			}

			seen.add(key)
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
