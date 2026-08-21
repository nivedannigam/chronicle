import { identityDocumentPath } from '@/constants/routes'
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
import type { IdentityDocumentRecord } from '@/features/identity-knowledge/types/identity-knowledge.types'

function isIdentityLibraryDocument(document: ChronicleDocument): boolean {
	return document.category_id === 'identity' && document.status !== 'failed'
}

function mapIdentityConsumerStatus(
	status: IdentityDocumentRecord['consumerStatus'],
): ChronicleDocumentSummary['consumerStatus'] {
	switch (status) {
		case 'ready':
			return 'Ready'
		case 'organizing':
			return 'Still Organizing'
		default:
			return 'Needs Help'
	}
}

function identityRecordToSummary(
	record: IdentityDocumentRecord,
	memberNames: Record<string, string>,
): ChronicleDocumentSummary {
	const expiry = record.expiryDate ? Date.parse(record.expiryDate) : NaN
	const isExpired = !Number.isNaN(expiry) && expiry < Date.now()
	const isExpiringSoon =
		!Number.isNaN(expiry) &&
		!isExpired &&
		expiry - Date.now() <= 1000 * 60 * 60 * 24 * 90

	return toModuleLibrarySummary({
		canonicalId: record.chronicleDocumentId,
		moduleId: 'identity',
		categoryId: 'identity',
		categoryLabel: 'Identity',
		title: record.title,
		documentType: record.typeLabel,
		sourceLabel: 'Identity folder',
		displayDate: formatLibraryDisplayDate(record.uploadedAt),
		summary: record.summary,
		familyMemberId: record.ownerMemberId,
		ownerLabel:
			record.ownerName || resolveOwnerLabel(memberNames, record.ownerMemberId),
		moduleDetailPath: identityDocumentPath(record.chronicleDocumentId),
		moduleDetailLabel: 'View in Identity',
		sourceKey: buildLibraryStableKey('identity', record.chronicleDocumentId),
		expiresLabel: record.expiryDate
			? formatLibraryDisplayDate(record.expiryDate)
			: null,
		isExpiringSoon,
		isExpired,
		hasAiSummary: false,
		tags: ['identity', record.typeId],
		consumerStatus: mapIdentityConsumerStatus(record.consumerStatus),
		year: record.uploadedAt ? new Date(record.uploadedAt).getFullYear() : null,
		privacySensitive: true,
	})
}

export const identityModuleProvider: ChronicleModuleProvider = {
	moduleId: 'identity',
	label: 'Identity',
	emoji: '🪪',
	priority: 11,

	getDocumentSection(query: ModuleProviderQuery): ModuleDocumentSection | null {
		const memberNames = query.memberNames ?? {}
		const scope = {
			memberId: query.memberId,
			accountOwnerMemberId: query.accountOwnerMemberId,
		}
		const documents: ChronicleDocumentSummary[] = []
		const seen = new Set<string>()

		for (const record of query.sources.identity?.knowledge?.documents ?? []) {
			if (!matchesLibraryMember(record.ownerMemberId, scope)) {
				continue
			}

			const summary = identityRecordToSummary(record, memberNames)

			if (seen.has(summary.sourceKey ?? summary.id)) {
				continue
			}

			seen.add(summary.sourceKey ?? summary.id)
			documents.push(summary)
		}

		for (const document of query.sources.documents?.uploadedDocuments ?? []) {
			if (!isIdentityLibraryDocument(document)) {
				continue
			}

			if (
				!matchesLibraryMember(document.family_member_id, scope) ||
				seen.has(buildLibraryStableKey('identity', document.id))
			) {
				continue
			}

			seen.add(buildLibraryStableKey('identity', document.id))
			documents.push(toDocumentSummary(document, memberNames))
		}

		if (documents.length === 0) {
			return null
		}

		const categoryCounts = new Map<string, number>()

		for (const document of documents) {
			const key = document.subCategoryLabel ?? 'identity'
			categoryCounts.set(key, (categoryCounts.get(key) ?? 0) + 1)
		}

		return {
			moduleId: 'identity',
			label: 'Identity',
			emoji: '🪪',
			totalCount: documents.length,
			categories: [...categoryCounts.entries()].map(([id, count]) => ({
				id,
				label: id,
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
			moduleId: 'identity',
			label: 'Identity',
			emoji: '🪪',
			documentCount: section.totalCount,
			headline: `${section.totalCount} identity document${section.totalCount === 1 ? '' : 's'}`,
		}
	},
}
