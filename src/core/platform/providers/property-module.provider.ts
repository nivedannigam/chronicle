import { propertyDetailPath, propertyDocumentPath } from '@/constants/routes'
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
import type { ChronicleDocumentSummary } from '@/features/documents/types/document-intelligence.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import { resolveConsumerDocumentStatus } from '@/features/documents/services/document-module-links.service'
import {
	getPropertyDocumentTypeDefinition,
	resolvePropertyDocumentTypeId,
	resolvePropertyNameFromPath,
	slugifyPropertyName,
} from '@/features/property-knowledge'
import type { PropertyDocumentRecord } from '@/features/property-knowledge/types/property-knowledge.types'
import type { PropertyDocumentTypeId } from '@/features/property-knowledge/services/property-type.registry'

function isPropertyLibraryDocument(document: ChronicleDocument): boolean {
	return document.category_id === 'property' && document.status !== 'failed'
}

function resolvePropertySlug(
	document: ChronicleDocument | PropertyDocumentRecord,
	rootFolderPath?: string | null,
): string | null {
	const folderPath =
		('folderPath' in document ? document.folderPath : null) ??
		(document as ChronicleDocument).extracted_metadata?.folderPath ??
		null
	const displayName = resolvePropertyNameFromPath({
		folderPath: typeof folderPath === 'string' ? folderPath : null,
		rootFolderPath,
	})

	if (!displayName) {
		return null
	}

	return slugifyPropertyName(displayName)
}

function propertyKnowledgeDocToSummary(
	document: PropertyDocumentRecord,
	memberNames: Record<string, string>,
	rootFolderPath?: string | null,
): ChronicleDocumentSummary {
	const typeLabel = getPropertyDocumentTypeDefinition(document.typeId).label
	const propertySlug = resolvePropertySlug(document, rootFolderPath)

	return toModuleLibrarySummary({
		canonicalId: document.chronicleDocumentId,
		moduleId: 'property',
		categoryId: 'property',
		categoryLabel: 'Property',
		title: document.title,
		documentType: typeLabel,
		sourceLabel: 'Home folder',
		displayDate: formatLibraryDisplayDate(document.uploadedAt),
		summary: `Property · ${typeLabel}`,
		familyMemberId: document.ownerMemberId,
		ownerLabel:
			document.ownerName ||
			resolveOwnerLabel(memberNames, document.ownerMemberId, 'Shared family'),
		moduleDetailPath: propertySlug
			? propertyDetailPath(propertySlug)
			: propertyDocumentPath(document.chronicleDocumentId),
		moduleDetailLabel: propertySlug ? 'View property' : 'View in Property',
		sourceKey: buildLibraryStableKey('property', document.chronicleDocumentId),
		hasAiSummary: false,
		tags: ['property', document.typeId],
		consumerStatus:
			document.consumerStatus === 'ready'
				? 'Ready'
				: document.consumerStatus === 'organizing'
					? 'Still Organizing'
					: 'Needs Help',
		year: new Date(document.uploadedAt).getFullYear(),
	})
}

function toPropertyDocumentSummary(
	document: ChronicleDocument,
	memberNames: Record<string, string>,
	rootFolderPath?: string | null,
): ChronicleDocumentSummary {
	const metadata = document.extracted_metadata ?? {}
	const folderPath = (metadata as { folderPath?: string }).folderPath ?? null
	const typeId = resolvePropertyDocumentTypeId({
		subCategoryId: document.sub_category_id,
		fileName: document.file_name,
		folderPath,
		title: document.title,
	})
	const typeLabel = getPropertyDocumentTypeDefinition(typeId).label
	const propertySlug = resolvePropertySlug(document, rootFolderPath)

	return toModuleLibrarySummary({
		canonicalId: document.id,
		moduleId: 'property',
		categoryId: document.category_id,
		categoryLabel: 'Property',
		title: document.title,
		documentType: typeLabel,
		sourceLabel: 'Home folder',
		displayDate: formatLibraryDisplayDate(document.uploaded_at),
		summary: `Property · ${typeLabel}`,
		familyMemberId: document.family_member_id,
		ownerLabel: resolveOwnerLabel(
			memberNames,
			document.family_member_id,
			'Shared family',
		),
		moduleDetailPath: propertySlug
			? propertyDetailPath(propertySlug)
			: propertyDocumentPath(document.id),
		moduleDetailLabel: propertySlug ? 'View property' : 'View in Property',
		sourceKey: buildLibraryStableKey('property', document.id),
		hasAiSummary: false,
		tags: ['property', typeId],
		consumerStatus: resolveConsumerDocumentStatus(document),
		year: new Date(document.uploaded_at).getFullYear(),
	})
}

export const propertyModuleProvider: ChronicleModuleProvider = {
	moduleId: 'property',
	label: 'Property',
	emoji: '🏠',
	priority: 14,

	getDocumentSection(query: ModuleProviderQuery): ModuleDocumentSection | null {
		const memberNames = query.memberNames ?? {}
		const scope = {
			memberId: query.memberId,
			accountOwnerMemberId: query.accountOwnerMemberId,
		}
		const rootFolderPath = query.sources.property?.rootFolderPath ?? null
		const documents: ChronicleDocumentSummary[] = []
		const seen = new Set<string>()
		const categoryCounts = new Map<string, number>()

		for (const document of query.sources.property?.knowledge?.documents ?? []) {
			if (!matchesLibraryMember(document.ownerMemberId, scope)) {
				continue
			}

			const summary = propertyKnowledgeDocToSummary(
				document,
				memberNames,
				rootFolderPath,
			)
			const key = summary.sourceKey ?? summary.id

			if (seen.has(key)) {
				continue
			}

			seen.add(key)
			documents.push(summary)
			categoryCounts.set(
				document.typeId,
				(categoryCounts.get(document.typeId) ?? 0) + 1,
			)
		}

		for (const document of query.sources.documents?.uploadedDocuments ?? []) {
			if (!isPropertyLibraryDocument(document)) {
				continue
			}

			if (!matchesLibraryMember(document.family_member_id, scope)) {
				continue
			}

			const key = buildLibraryStableKey('property', document.id)

			if (seen.has(key)) {
				continue
			}

			seen.add(key)
			const summary = toPropertyDocumentSummary(
				document,
				memberNames,
				rootFolderPath,
			)
			documents.push(summary)

			const metadata = document.extracted_metadata ?? {}
			const folderPath =
				(metadata as { folderPath?: string }).folderPath ?? null
			const typeId = resolvePropertyDocumentTypeId({
				subCategoryId: document.sub_category_id,
				fileName: document.file_name,
				folderPath,
				title: document.title,
			})
			categoryCounts.set(typeId, (categoryCounts.get(typeId) ?? 0) + 1)
		}

		if (documents.length === 0) {
			return null
		}

		return {
			moduleId: 'property',
			label: 'Property',
			emoji: '🏠',
			totalCount: documents.length,
			categories: [...categoryCounts.entries()].map(([id, count]) => ({
				id,
				label: getPropertyDocumentTypeDefinition(id as PropertyDocumentTypeId)
					.label,
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

		const headline = query.sources.property?.knowledge?.summary.headline

		return {
			moduleId: 'property',
			label: 'Property',
			emoji: '🏠',
			documentCount: section.totalCount,
			headline: headline && !headline.includes('Connect') ? headline : null,
		}
	},
}
