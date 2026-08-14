import { ROUTES, insurancePolicyDetailPath } from '@/constants/routes'
import type {
	ChronicleModuleProvider,
	ModuleDocumentSection,
	ModuleProviderQuery,
	ModuleSummary,
} from '@/core/platform/contracts/module-provider.contract'
import { toDocumentSummary } from '@/features/documents/services/document-intelligence.service'
import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type { ChronicleDocumentSummary } from '@/features/documents/types/document-intelligence.types'
import { getCategoryMeta } from '@/features/insurance-knowledge/graph/policy-categories'
import type { PolicyCategoryId } from '@/features/insurance-knowledge/types/insurance-knowledge.types'

function isInsuranceLibraryDocument(document: ChronicleDocument): boolean {
	return document.category_id === 'insurance'
}

function insuranceKnowledgeDocToSummary(
	document: {
		id: string
		fileName: string
		documentKind: string
		uploadedAt: string
		isDisplayReady?: boolean
	},
	memberNames: Record<string, string>,
	memberId: string | null | undefined,
): ChronicleDocumentSummary {
	return {
		id: document.id,
		title: document.fileName,
		categoryId: 'insurance',
		categoryLabel: 'Insurance',
		subCategoryLabel: document.documentKind.replace(/_/g, ' '),
		ownerLabel: memberId
			? (memberNames[memberId] ?? 'Family member')
			: 'Account owner',
		sourceLabel: 'Insurance folder',
		summary: document.documentKind.replace(/_/g, ' '),
		displayDate: new Date(document.uploadedAt).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		}),
		expiresLabel: null,
		isExpiringSoon: false,
		isExpired: false,
		fileType: 'PDF',
		hasAiSummary: true,
		tags: ['insurance'],
		relatedModules: [
			{
				moduleId: 'insurance',
				label: 'Insurance',
				route: ROUTES.insurancePolicies,
			},
		],
		consumerStatus: document.isDisplayReady ? 'Ready' : 'Still Organizing',
		aiDiscoveryLabel: null,
		year: new Date(document.uploadedAt).getFullYear(),
	}
}

export const insuranceModuleProvider: ChronicleModuleProvider = {
	moduleId: 'insurance',
	label: 'Insurance',
	emoji: '🛡️',
	priority: 15,

	getDocumentSection(query: ModuleProviderQuery): ModuleDocumentSection | null {
		const knowledge = query.sources.insurance?.knowledge
		const memberNames = query.memberNames ?? {}
		const documents: ChronicleDocumentSummary[] = []
		const categoryCounts = new Map<string, number>()

		for (const document of knowledge?.documents ?? []) {
			documents.push(
				insuranceKnowledgeDocToSummary(
					document,
					memberNames,
					knowledge?.familyMember.id,
				),
			)
		}

		for (const document of query.sources.documents?.uploadedDocuments ?? []) {
			if (!isInsuranceLibraryDocument(document)) {
				continue
			}

			documents.push(toDocumentSummary(document, memberNames))
		}

		for (const policy of knowledge?.policies ?? []) {
			categoryCounts.set(
				policy.categoryId,
				(categoryCounts.get(policy.categoryId) ?? 0) + 1,
			)

			const alreadyListed = documents.some(
				(document) =>
					document.id === policy.id ||
					document.title === policy.productName ||
					document.title === policy.policyNumber,
			)

			if (!alreadyListed) {
				documents.push({
					id: `insurance-policy-${policy.id}`,
					title: policy.productName ?? policy.policyNumber,
					categoryId: 'insurance',
					categoryLabel: 'Insurance',
					subCategoryLabel: getCategoryMeta(
						policy.categoryId as PolicyCategoryId,
					).name,
					ownerLabel: knowledge?.familyMember.id
						? (memberNames[knowledge.familyMember.id] ?? 'Family member')
						: 'Account owner',
					sourceLabel: 'Insurance policy',
					summary: policy.policyNumber,
					displayDate: policy.inceptionDate
						? new Date(policy.inceptionDate).toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric',
								year: 'numeric',
							})
						: '—',
					expiresLabel: policy.expiryDate ?? null,
					isExpiringSoon: false,
					isExpired: policy.status === 'expired',
					fileType: 'POLICY',
					hasAiSummary: true,
					tags: ['insurance', policy.categoryId],
					relatedModules: [
						{
							moduleId: 'insurance',
							label: 'Insurance',
							route: insurancePolicyDetailPath(policy.id),
						},
					],
					consumerStatus: 'Ready',
					aiDiscoveryLabel: null,
					year: policy.inceptionDate
						? new Date(policy.inceptionDate).getFullYear()
						: null,
				})
			}
		}

		if (documents.length === 0 && (knowledge?.policies.length ?? 0) === 0) {
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
