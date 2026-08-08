import type { ChronicleDocument } from '@/features/documents/types/document.types'
import type {
	ChronicleDocumentSummary,
	DocumentConsumerStatus,
	DocumentLibraryFilters,
} from '@/features/documents/types/document-intelligence.types'
import {
	searchDocumentsLocal,
	toDocumentSummary,
} from '@/features/documents/services/document-intelligence.service'

const NL_QUERY_ALIASES: Record<string, string[]> = {
	passport: ['passport', 'travel document'],
	aadhaar: ['aadhaar', 'aadhar', 'uid'],
	pan: ['pan', 'permanent account'],
	licence: ['licence', 'license', 'driving'],
	mahindra: ['mahindra', 'xev', 'vehicle', 'motor'],
	insurance: ['insurance', 'policy', 'premium', 'coverage'],
	health: ['health', 'medical', 'lab', 'report', 'blood test', 'checkup'],
	invoice: ['invoice', 'receipt', 'bill'],
	loan: ['loan', 'mortgage', 'home loan'],
	salary: ['salary', 'payslip', 'pay slip'],
	tax: ['tax', 'itr', 'property tax'],
	vehicle: ['vehicle', 'motor', 'car', 'rc'],
	advika: ['advika'],
	latest: ['latest', 'recent', 'newest'],
}

function tokenizeQuery(query: string): string[] {
	return query
		.toLowerCase()
		.split(/[\s,]+/)
		.filter(Boolean)
}

function expandNaturalLanguageQuery(query: string): string[] {
	const tokens = tokenizeQuery(query)
	const expanded = new Set(tokens)

	for (const token of tokens) {
		for (const [, aliases] of Object.entries(NL_QUERY_ALIASES)) {
			if (
				aliases.some((alias) => alias.includes(token) || token.includes(alias))
			) {
				for (const alias of aliases) {
					expanded.add(alias)
				}
			}
		}
	}

	return [...expanded]
}

export function searchDocumentsNaturalLanguage(
	documents: ChronicleDocument[],
	query: string,
	memberNames: Record<string, string>,
): ChronicleDocument[] {
	const normalized = query.trim().toLowerCase()

	if (!normalized) {
		return documents
	}

	const expandedTerms = expandNaturalLanguageQuery(normalized)
	const directMatches = searchDocumentsLocal(documents, query, memberNames)
	const directIds = new Set(directMatches.map((document) => document.id))

	const scored = documents
		.map((document) => {
			if (directIds.has(document.id)) {
				return { document, score: 100 }
			}

			const summary = toDocumentSummary(document, memberNames)
			const haystack = [
				document.title,
				document.file_name,
				summary.categoryLabel,
				summary.subCategoryLabel,
				summary.ownerLabel,
				document.tags.join(' '),
				document.issuer,
				JSON.stringify(document.extracted_metadata),
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()

			let score = 0

			for (const term of expandedTerms) {
				if (haystack.includes(term)) {
					score += term.length >= 4 ? 3 : 1
				}
			}

			return { document, score }
		})
		.filter((entry) => entry.score > 0)
		.sort((a, b) => b.score - a.score)

	return scored.map((entry) => entry.document)
}

function summarySearchHaystack(summary: ChronicleDocumentSummary): string {
	return [
		summary.title,
		summary.summary,
		summary.categoryLabel,
		summary.subCategoryLabel,
		summary.ownerLabel,
		summary.sourceLabel,
		summary.tags.join(' '),
		summary.relatedModules.map((module) => module.label).join(' '),
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase()
}

export function searchFederatedLibrarySummaries(
	summaries: ChronicleDocumentSummary[],
	query: string,
): ChronicleDocumentSummary[] {
	const normalized = query.trim().toLowerCase()

	if (!normalized) {
		return summaries
	}

	const expandedTerms = expandNaturalLanguageQuery(normalized)

	return summaries
		.map((summary) => {
			const haystack = summarySearchHaystack(summary)
			let score = 0

			for (const term of expandedTerms) {
				if (haystack.includes(term)) {
					score += term.length >= 4 ? 3 : 1
				}
			}

			return { summary, score }
		})
		.filter((entry) => entry.score > 0)
		.sort((left, right) => right.score - left.score)
		.map((entry) => entry.summary)
}

function documentYear(document: ChronicleDocument): number | null {
	const date = document.issue_date ?? document.uploaded_at
	const parsed = Date.parse(date)

	if (Number.isNaN(parsed)) {
		return null
	}

	return new Date(parsed).getFullYear()
}

export function filterDocumentLibrary(
	documents: ChronicleDocument[],
	summaries: ChronicleDocumentSummary[],
	filters: DocumentLibraryFilters,
	memberNames: Record<string, string>,
): ChronicleDocumentSummary[] {
	let filtered = documents

	if (filters.query.trim()) {
		filtered = searchDocumentsNaturalLanguage(
			filtered,
			filters.query,
			memberNames,
		)
	}

	const summaryById = new Map(summaries.map((summary) => [summary.id, summary]))
	let results = filtered
		.map((document) => summaryById.get(document.id))
		.filter((summary): summary is ChronicleDocumentSummary => summary != null)

	if (filters.categoryId) {
		results = results.filter(
			(summary) => summary.categoryId === filters.categoryId,
		)
	}

	if (filters.familyMemberId) {
		const memberDocuments = new Set(
			documents
				.filter(
					(document) => document.family_member_id === filters.familyMemberId,
				)
				.map((document) => document.id),
		)

		results = results.filter((summary) => memberDocuments.has(summary.id))
	}

	if (filters.subCategoryId) {
		results = results.filter(
			(summary) =>
				documents.find((document) => document.id === summary.id)
					?.sub_category_id === filters.subCategoryId,
		)
	}

	if (filters.year) {
		results = results.filter((summary) => summary.year === filters.year)
	}

	if (filters.source) {
		results = results.filter((summary) => {
			const document = documents.find((item) => item.id === summary.id)
			return document?.source === filters.source
		})
	}

	if (filters.consumerStatus) {
		results = results.filter(
			(summary) => summary.consumerStatus === filters.consumerStatus,
		)
	}

	return results
}

export function filterFederatedLibrarySummaries(
	summaries: ChronicleDocumentSummary[],
	filters: DocumentLibraryFilters,
	memberNames: Record<string, string>,
): ChronicleDocumentSummary[] {
	let results = summaries

	if (filters.query.trim()) {
		results = searchFederatedLibrarySummaries(results, filters.query)
	}

	if (filters.moduleId) {
		results = results.filter((summary) =>
			summary.relatedModules.some(
				(module) => module.moduleId === filters.moduleId,
			),
		)
	}

	if (filters.categoryId) {
		results = results.filter(
			(summary) => summary.categoryId === filters.categoryId,
		)
	}

	if (filters.familyMemberId) {
		const memberName = memberNames[filters.familyMemberId]

		if (memberName) {
			results = results.filter((summary) => summary.ownerLabel === memberName)
		}
	}

	if (filters.year) {
		results = results.filter((summary) => summary.year === filters.year)
	}

	if (filters.source) {
		const sourceLabel =
			filters.source === 'google-drive' ? 'google drive' : filters.source

		results = results.filter((summary) =>
			summary.sourceLabel.toLowerCase().includes(sourceLabel),
		)
	}

	if (filters.consumerStatus) {
		results = results.filter(
			(summary) => summary.consumerStatus === filters.consumerStatus,
		)
	}

	return results
}

export function extractAvailableYears(
	documents: ChronicleDocument[],
): number[] {
	return [
		...new Set(
			documents
				.map(documentYear)
				.filter((year): year is number => year != null),
		),
	].sort((a, b) => b - a)
}

export function defaultLibraryFilters(): DocumentLibraryFilters {
	return {
		query: '',
		categoryId: null,
		familyMemberId: null,
		subCategoryId: null,
		year: null,
		source: null,
		consumerStatus: null,
		moduleId: null,
	}
}

export function countByConsumerStatus(
	summaries: ChronicleDocumentSummary[],
): Record<DocumentConsumerStatus, number> {
	return summaries.reduce(
		(counts, summary) => {
			counts[summary.consumerStatus] += 1
			return counts
		},
		{
			Ready: 0,
			'Needs Help': 0,
			'Still Organizing': 0,
		} satisfies Record<DocumentConsumerStatus, number>,
	)
}
