import type { PlatformModuleId } from '@/core/platform/contracts/platform-module.contract'
import type {
	ModuleLibraryDocumentInput,
	ModuleLibraryMemberScope,
} from '@/core/platform/contracts/module-document-provider.contract'
import type {
	ChronicleDocumentSummary,
	DocumentConsumerStatus,
} from '@/features/documents/types/document-intelligence.types'

export function formatLibraryDisplayDate(
	value: string | null | undefined,
): string {
	if (!value) {
		return '—'
	}

	const parsed = Date.parse(value)

	if (Number.isNaN(parsed)) {
		return '—'
	}

	return new Date(parsed).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

export function resolveLibraryYear(
	value: string | null | undefined,
): number | null {
	if (!value) {
		return null
	}

	const parsed = Date.parse(value)

	if (Number.isNaN(parsed)) {
		return null
	}

	return new Date(parsed).getFullYear()
}

export function buildLibraryStableKey(
	moduleId: PlatformModuleId | 'documents',
	canonicalId: string,
): string {
	return `${moduleId}:${canonicalId}`
}

export function matchesLibraryMember(
	recordMemberId: string | null | undefined,
	scope: ModuleLibraryMemberScope,
): boolean {
	if (!scope.memberId) {
		return true
	}

	if (!recordMemberId) {
		return scope.memberId === (scope.accountOwnerMemberId ?? null)
	}

	return recordMemberId === scope.memberId
}

export function toModuleLibrarySummary(
	input: ModuleLibraryDocumentInput,
): ChronicleDocumentSummary {
	const consumerStatus: DocumentConsumerStatus = input.consumerStatus ?? 'Ready'

	return {
		id: input.canonicalId,
		title: input.title,
		categoryId: input.categoryId,
		categoryLabel: input.categoryLabel,
		subCategoryLabel: input.documentType ?? null,
		ownerLabel: input.ownerLabel,
		sourceLabel: input.sourceLabel,
		summary: input.summary,
		displayDate: input.displayDate,
		expiresLabel: input.expiresLabel ?? null,
		isExpiringSoon: input.isExpiringSoon ?? false,
		isExpired: input.isExpired ?? false,
		fileType: input.fileType ?? 'PDF',
		hasAiSummary: input.hasAiSummary ?? false,
		tags: input.tags ?? [input.moduleId],
		relatedModules: [
			{
				moduleId: input.moduleId,
				label: input.categoryLabel,
				route: input.moduleDetailPath,
			},
		],
		moduleDetailLink: {
			label: input.moduleDetailLabel,
			path: input.moduleDetailPath,
		},
		consumerStatus,
		aiDiscoveryLabel: null,
		year: input.year ?? null,
		familyMemberId: input.familyMemberId ?? null,
		sourceKey: input.sourceKey,
		privacySensitive: input.privacySensitive ?? false,
	}
}

export function dedupeLibrarySummaries(
	summaries: ChronicleDocumentSummary[],
): ChronicleDocumentSummary[] {
	const seen = new Set<string>()
	const deduped: ChronicleDocumentSummary[] = []

	for (const summary of summaries) {
		const key =
			summary.sourceKey ??
			buildLibraryStableKey(
				(summary.relatedModules[0]?.moduleId as
					PlatformModuleId | 'documents') ?? 'documents',
				summary.id,
			)

		if (seen.has(key)) {
			continue
		}

		seen.add(key)
		deduped.push(summary)
	}

	return deduped
}

export function resolveOwnerLabel(
	memberNames: Record<string, string>,
	memberId: string | null | undefined,
	fallback = 'Account owner',
): string {
	if (!memberId) {
		return fallback
	}

	return memberNames[memberId] ?? 'Family member'
}
