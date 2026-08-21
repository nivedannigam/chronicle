import {
	buildFinanceEntityDedupeKey,
	resolveFinanceEntityId,
} from '@/features/finance-knowledge/services/finance-entity-resolver.service'
import type { FinanceEntityKind } from '@/features/finance-knowledge/types/finance-extraction.types'
import type {
	FinanceEntityMatchCandidate,
	FinanceEntityResolutionResult,
} from '@/features/finance-knowledge/types/finance-history.types'
import type { FinanceOwnership } from '@/features/finance-knowledge/types/finance-knowledge.types'

function normalizeKey(value: string | null | undefined): string {
	return (value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

export function buildFinanceEntityMetadataLabel(input: {
	kind: FinanceEntityKind
	accountType: string | null
	cardName: string | null
	loanType: string | null
	schemeName: string | null
}): string | null {
	switch (input.kind) {
		case 'credit_card':
			return input.cardName
		case 'loan':
			return input.loanType
		case 'investment_account':
			return input.schemeName
		default:
			return input.accountType
	}
}

export function buildFinanceStrongIdentifierKey(input: {
	kind: FinanceEntityKind
	maskedIdentifier: string | null
}): string | null {
	const identifier = normalizeKey(input.maskedIdentifier?.replace(/\*/g, ''))
	if (!identifier || identifier.length < 4) {
		return null
	}

	return `${input.kind}:id:${identifier.slice(-4)}`
}

export function buildFinanceInstitutionIdentifierKey(input: {
	kind: FinanceEntityKind
	institutionName: string | null
	maskedIdentifier: string | null
}): string | null {
	const institution = normalizeKey(input.institutionName)
	const identifier = normalizeKey(input.maskedIdentifier?.replace(/\*/g, ''))

	if (!institution || !identifier || identifier.length < 4) {
		return null
	}

	return `${input.kind}:${institution}:${identifier.slice(-4)}`
}

export function buildFinanceMetadataMatchKey(input: {
	kind: FinanceEntityKind
	institutionName: string | null
	metadataLabel: string | null
}): string | null {
	const institution = normalizeKey(input.institutionName)
	const metadata = normalizeKey(input.metadataLabel)

	if (!institution || !metadata) {
		return null
	}

	return `${input.kind}:${institution}:${metadata}`
}

export function resolveOwnershipFromExtraction(input: {
	accountHolder: string | null
	jointHolder: string | null
}): FinanceOwnership {
	if (input.jointHolder?.trim()) {
		return 'joint'
	}

	if (input.accountHolder?.trim()) {
		return 'individual'
	}

	return 'unknown'
}

export function findMatchingEntityCandidates(input: {
	kind: FinanceEntityKind
	institutionName: string | null
	maskedIdentifier: string | null
	metadataLabel: string | null
	existing: FinanceEntityMatchCandidate[]
}): FinanceEntityMatchCandidate[] {
	const strongId = buildFinanceStrongIdentifierKey({
		kind: input.kind,
		maskedIdentifier: input.maskedIdentifier,
	})
	const institutionId = buildFinanceInstitutionIdentifierKey({
		kind: input.kind,
		institutionName: input.institutionName,
		maskedIdentifier: input.maskedIdentifier,
	})
	const metadataKey = buildFinanceMetadataMatchKey({
		kind: input.kind,
		institutionName: input.institutionName,
		metadataLabel: input.metadataLabel,
	})

	const keys = [strongId, institutionId, metadataKey].filter(Boolean)

	return input.existing.filter((candidate) => {
		if (candidate.kind !== input.kind) {
			return false
		}

		if (strongId && candidate.dedupeKey === strongId) {
			return true
		}

		if (institutionId && candidate.dedupeKey === institutionId) {
			return true
		}

		if (
			metadataKey &&
			candidate.dedupeKey === metadataKey &&
			!input.maskedIdentifier
		) {
			return true
		}

		return keys.includes(candidate.dedupeKey)
	})
}

export function resolveFinanceEntityForDocument(input: {
	kind: FinanceEntityKind
	institutionName: string | null
	maskedIdentifier: string | null
	metadataLabel: string | null
	fallbackLabel: string
	accountHolder: string | null
	jointHolder: string | null
	existing: FinanceEntityMatchCandidate[]
}): FinanceEntityResolutionResult {
	const ownership = resolveOwnershipFromExtraction({
		accountHolder: input.accountHolder,
		jointHolder: input.jointHolder,
	})

	const identifierKey = buildFinanceInstitutionIdentifierKey({
		kind: input.kind,
		institutionName: input.institutionName,
		maskedIdentifier: input.maskedIdentifier,
	})
	const metadataKey = buildFinanceMetadataMatchKey({
		kind: input.kind,
		institutionName: input.institutionName,
		metadataLabel: input.metadataLabel,
	})

	const dedupeKey =
		identifierKey ??
		(input.maskedIdentifier ? null : metadataKey) ??
		buildFinanceEntityDedupeKey({
			kind: input.kind,
			institutionName: input.institutionName,
			maskedIdentifier: input.maskedIdentifier,
		})

	const matches = findMatchingEntityCandidates({
		kind: input.kind,
		institutionName: input.institutionName,
		maskedIdentifier: input.maskedIdentifier,
		metadataLabel: input.metadataLabel,
		existing: input.existing,
	})

	if (matches.length > 1) {
		const bestMatch = matches[0]!
		return {
			entityId: bestMatch.entityId,
			resolutionState: 'ambiguous',
			dedupeKey,
			ownership,
		}
	}

	if (matches.length === 1) {
		return {
			entityId: matches[0]!.entityId,
			resolutionState: 'matched',
			dedupeKey,
			ownership,
		}
	}

	if (dedupeKey) {
		return {
			entityId: resolveFinanceEntityId({
				kind: input.kind,
				institutionName: input.institutionName,
				maskedIdentifier: input.maskedIdentifier,
				fallbackLabel: input.fallbackLabel,
			}),
			resolutionState: 'new',
			dedupeKey,
			ownership,
		}
	}

	return {
		entityId: resolveFinanceEntityId({
			kind: input.kind,
			institutionName: input.institutionName,
			maskedIdentifier: input.maskedIdentifier,
			fallbackLabel: input.fallbackLabel,
		}),
		resolutionState: 'unresolved',
		dedupeKey: null,
		ownership,
	}
}

export function shouldMergeFinanceEntityMetadata(
	left: string | null,
	right: string | null,
): boolean {
	if (!left || !right) {
		return false
	}

	return normalizeKey(left) === normalizeKey(right)
}
