import { insurancePolicyDetailPath, ROUTES } from '@/constants/routes'
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
import { resolveConsumerPolicyNumberLabel } from '@/features/insurance-knowledge/utils/policy-number-provenance'
import { toDocumentSummary } from '@/features/documents/services/document-intelligence.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { ChronicleDocumentSummary } from '@/features/documents/types/document-intelligence.types'
import { getCategoryMeta } from '@/features/insurance-knowledge/graph/policy-categories'
import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import type {
	InsuranceKnowledgeDocumentRef,
	InsuranceKnowledgePolicy,
} from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'

function isInsuranceLibraryDocument(document: ChronicleDocument): boolean {
	return document.category_id === 'insurance' && document.status !== 'failed'
}

function insuranceDocumentToSummary(
	document: InsuranceKnowledgeDocumentRef,
	memberNames: Record<string, string>,
	familyMemberId: string | null | undefined,
): ChronicleDocumentSummary {
	const linkedPolicyId = document.linkedPolicyIds[0] ?? null

	return toModuleLibrarySummary({
		canonicalId: document.id,
		moduleId: 'insurance',
		categoryId: 'insurance',
		categoryLabel: 'Insurance',
		title: document.fileName,
		documentType: document.documentKind.replace(/_/g, ' '),
		sourceLabel: 'Insurance folder',
		displayDate: formatLibraryDisplayDate(document.uploadedAt),
		summary: document.documentKind.replace(/_/g, ' '),
		familyMemberId: familyMemberId ?? null,
		ownerLabel: resolveOwnerLabel(memberNames, familyMemberId),
		moduleDetailPath: linkedPolicyId
			? insurancePolicyDetailPath(linkedPolicyId)
			: ROUTES.insurancePolicies,
		moduleDetailLabel: linkedPolicyId ? 'View policy' : 'View in Insurance',
		sourceKey: buildLibraryStableKey('insurance', document.id),
		hasAiSummary: true,
		tags: ['insurance'],
		consumerStatus: document.isDisplayReady ? 'Ready' : 'Still Organizing',
		year: resolveLibraryYear(document.uploadedAt),
	})
}

function insurancePolicyToSummary(
	policy: InsuranceKnowledgePolicy,
	memberNames: Record<string, string>,
	familyMemberId: string | null | undefined,
): ChronicleDocumentSummary {
	return toModuleLibrarySummary({
		canonicalId: `insurance-policy-${policy.id}`,
		moduleId: 'insurance',
		categoryId: 'insurance',
		categoryLabel: 'Insurance',
		title: policy.productName ?? resolveConsumerPolicyNumberLabel(policy),
		documentType: getCategoryMeta(policy.categoryId as PolicyCategoryId).name,
		sourceLabel: 'Insurance policy',
		displayDate: formatLibraryDisplayDate(
			policy.inceptionDate ?? policy.expiryDate,
		),
		summary: resolveConsumerPolicyNumberLabel(policy),
		familyMemberId: familyMemberId ?? null,
		ownerLabel: resolveOwnerLabel(memberNames, familyMemberId),
		moduleDetailPath: insurancePolicyDetailPath(policy.id),
		moduleDetailLabel: 'View policy',
		sourceKey: buildLibraryStableKey('insurance', `policy:${policy.id}`),
		expiresLabel: policy.expiryDate,
		isExpired: policy.status === 'expired',
		fileType: 'POLICY',
		hasAiSummary: true,
		tags: ['insurance', policy.categoryId],
		consumerStatus: 'Ready',
		year: resolveLibraryYear(policy.inceptionDate),
	})
}

function resolveLibraryYear(value: string | null | undefined): number | null {
	if (!value) {
		return null
	}

	const parsed = Date.parse(value)
	return Number.isNaN(parsed) ? null : new Date(parsed).getFullYear()
}

export const insuranceModuleProvider: ChronicleModuleProvider = {
	moduleId: 'insurance',
	label: 'Insurance',
	emoji: '🛡️',
	priority: 15,

	getDocumentSection(query: ModuleProviderQuery): ModuleDocumentSection | null {
		const knowledge = query.sources.insurance?.knowledge
		const memberNames = query.memberNames ?? {}
		const familyMemberId = knowledge?.familyMember.id
		const memberScope = {
			memberId: query.memberId ?? null,
			accountOwnerMemberId: query.accountOwnerMemberId ?? null,
		}
		const documents: ChronicleDocumentSummary[] = []
		const seen = new Set<string>()
		const categoryCounts = new Map<string, number>()

		for (const document of knowledge?.documents ?? []) {
			const summary = insuranceDocumentToSummary(
				document,
				memberNames,
				familyMemberId,
			)
			const key = summary.sourceKey ?? summary.id

			if (seen.has(key)) {
				continue
			}

			seen.add(key)
			documents.push(summary)
		}

		for (const document of query.sources.documents?.uploadedDocuments ?? []) {
			if (!isInsuranceLibraryDocument(document)) {
				continue
			}

			if (!matchesLibraryMember(document.family_member_id, memberScope)) {
				continue
			}

			const key = buildLibraryStableKey('insurance', document.id)

			if (seen.has(key)) {
				continue
			}

			seen.add(key)
			documents.push(toDocumentSummary(document, memberNames))
		}

		for (const policy of knowledge?.policies ?? []) {
			categoryCounts.set(
				policy.categoryId,
				(categoryCounts.get(policy.categoryId) ?? 0) + 1,
			)

			const summary = insurancePolicyToSummary(
				policy,
				memberNames,
				familyMemberId,
			)

			if (!matchesLibraryMember(summary.familyMemberId, memberScope)) {
				continue
			}

			const key = summary.sourceKey ?? summary.id

			if (seen.has(key)) {
				continue
			}

			seen.add(key)
			documents.push(summary)
		}

		if (documents.length === 0) {
			return null
		}

		const categories =
			categoryCounts.size > 0
				? [...categoryCounts.entries()].map(([id, count]) => ({
						id,
						label: getCategoryMeta(id as PolicyCategoryId).name,
						count,
					}))
				: [
						{
							id: 'insurance',
							label: 'Insurance Documents',
							count: documents.length,
						},
					]

		return {
			moduleId: 'insurance',
			label: 'Insurance',
			emoji: '🛡️',
			totalCount: documents.length,
			categories,
			documents,
		}
	},

	getSummary(query: ModuleProviderQuery): ModuleSummary | null {
		const section = this.getDocumentSection(query)

		if (!section) {
			return null
		}

		return {
			moduleId: 'insurance',
			label: 'Insurance',
			emoji: '🛡️',
			documentCount: section.totalCount,
			headline: `${section.totalCount} insurance document${section.totalCount === 1 ? '' : 's'}`,
		}
	},
}
