import { financeDocumentPath } from '@/constants/routes'
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
import {
	getFinanceDocumentTypeLabel,
	readFinanceClassificationFromMetadata,
} from '@/features/finance-knowledge'
import type { FinanceDocumentRef } from '@/features/finance-knowledge/types/finance-knowledge.types'
import { resolveConsumerDocumentStatus } from '@/features/documents/services/document-module-links.service'

function isFinanceLibraryDocument(document: ChronicleDocument): boolean {
	return document.category_id === 'financial' && document.status !== 'failed'
}

function mapFinanceConsumerStatus(
	status: FinanceDocumentRef['consumerStatus'],
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

function financeKnowledgeDocToSummary(
	document: FinanceDocumentRef,
	memberNames: Record<string, string>,
): ChronicleDocumentSummary {
	return toModuleLibrarySummary({
		canonicalId: document.chronicleDocumentId,
		moduleId: 'finance',
		categoryId: 'financial',
		categoryLabel: 'Finance',
		title: document.title,
		documentType: document.subCategoryLabel ?? document.subCategoryId,
		sourceLabel: 'Finance folder',
		displayDate: formatLibraryDisplayDate(document.uploadedAt),
		summary: `Finance · ${document.displayLabel}`,
		familyMemberId: document.ownerMemberId,
		ownerLabel:
			document.ownerName ||
			resolveOwnerLabel(memberNames, document.ownerMemberId),
		moduleDetailPath: financeDocumentPath(document.chronicleDocumentId),
		moduleDetailLabel: 'View in Finance',
		sourceKey: buildLibraryStableKey('finance', document.chronicleDocumentId),
		hasAiSummary: false,
		tags: ['finance', document.subCategoryId ?? 'other'],
		consumerStatus: mapFinanceConsumerStatus(document.consumerStatus),
		year: new Date(document.uploadedAt).getFullYear(),
		privacySensitive: true,
	})
}

function toFinanceDocumentSummary(
	document: ChronicleDocument,
	memberNames: Record<string, string>,
): ChronicleDocumentSummary {
	const metadata = document.extracted_metadata ?? {}
	const displayLabel =
		readMetaString(metadata, 'financeDisplayLabel') ??
		document.knowledge_refs.find((ref) => ref.domain === 'finance')?.label ??
		document.title.replace(/^Finance · /, '')
	const subCategoryId =
		readFinanceClassificationFromMetadata(metadata)?.type ??
		document.sub_category_id ??
		'other'

	return toModuleLibrarySummary({
		canonicalId: document.id,
		moduleId: 'finance',
		categoryId: document.category_id,
		categoryLabel: 'Finance',
		title: document.title,
		documentType: getFinanceDocumentTypeLabel(subCategoryId),
		sourceLabel: 'Finance folder',
		displayDate: formatLibraryDisplayDate(document.uploaded_at),
		summary: `Finance · ${displayLabel}`,
		familyMemberId: document.family_member_id,
		ownerLabel: resolveOwnerLabel(
			memberNames,
			document.family_member_id,
			'Shared family',
		),
		moduleDetailPath: financeDocumentPath(document.id),
		moduleDetailLabel: 'View in Finance',
		sourceKey: buildLibraryStableKey('finance', document.id),
		hasAiSummary: false,
		tags: ['finance', subCategoryId],
		consumerStatus: resolveConsumerDocumentStatus(document),
		year: new Date(document.uploaded_at).getFullYear(),
		privacySensitive: true,
	})
}

function readMetaString(
	metadata: Record<string, unknown>,
	key: string,
): string | null {
	const value = metadata[key]
	return typeof value === 'string' && value.trim() ? value.trim() : null
}

export const financeModuleProvider: ChronicleModuleProvider = {
	moduleId: 'finance',
	label: 'Finance',
	emoji: '💰',
	priority: 13,

	getDocumentSection(query: ModuleProviderQuery): ModuleDocumentSection | null {
		const memberNames = query.memberNames ?? {}
		const scope = {
			memberId: query.memberId,
			accountOwnerMemberId: query.accountOwnerMemberId,
		}
		const documents: ChronicleDocumentSummary[] = []
		const seen = new Set<string>()
		const categoryCounts = new Map<string, number>()

		for (const document of query.sources.finance?.knowledge?.documents ?? []) {
			if (!matchesLibraryMember(document.ownerMemberId, scope)) {
				continue
			}

			const summary = financeKnowledgeDocToSummary(document, memberNames)
			const key = summary.sourceKey ?? summary.id

			if (seen.has(key)) {
				continue
			}

			seen.add(key)
			documents.push(summary)

			const subCategoryId = document.subCategoryId ?? 'other'
			categoryCounts.set(
				subCategoryId,
				(categoryCounts.get(subCategoryId) ?? 0) + 1,
			)
		}

		for (const document of query.sources.documents?.uploadedDocuments ?? []) {
			if (!isFinanceLibraryDocument(document)) {
				continue
			}

			if (!matchesLibraryMember(document.family_member_id, scope)) {
				continue
			}

			const key = buildLibraryStableKey('finance', document.id)

			if (seen.has(key)) {
				continue
			}

			seen.add(key)
			const summary = toFinanceDocumentSummary(document, memberNames)
			documents.push(summary)

			const metadata = document.extracted_metadata ?? {}
			const subCategoryId =
				readFinanceClassificationFromMetadata(metadata)?.type ??
				document.sub_category_id ??
				'other'
			categoryCounts.set(
				subCategoryId,
				(categoryCounts.get(subCategoryId) ?? 0) + 1,
			)
		}

		if (documents.length === 0) {
			return null
		}

		return {
			moduleId: 'finance',
			label: 'Finance',
			emoji: '💰',
			totalCount: documents.length,
			categories: [...categoryCounts.entries()].map(([id, count]) => ({
				id,
				label: getFinanceDocumentTypeLabel(id),
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
			moduleId: 'finance',
			label: 'Finance',
			emoji: '💰',
			documentCount: section.totalCount,
			headline: `${section.totalCount} finance document${section.totalCount === 1 ? '' : 's'}`,
		}
	},
}
