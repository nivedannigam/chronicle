import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type {
	PropertyOwnership,
	PropertyRecord,
	PropertyResolutionState,
} from '@/features/property-knowledge/types/property-knowledge.types'
import {
	slugifyPropertyName,
	normalizePropertyDisplayName,
} from '@/features/property-knowledge/services/property-folder-resolver'

export interface PropertyEntityCandidate {
	displayName: string
	slug: string
	folderPaths: string[]
	documentIds: string[]
	ownerMemberIds: string[]
}

export function buildPropertyEntityKey(displayName: string): string {
	return slugifyPropertyName(normalizePropertyDisplayName(displayName))
}

export function mergePropertyCandidates(
	candidates: PropertyEntityCandidate[],
): PropertyEntityCandidate[] {
	const bySlug = new Map<string, PropertyEntityCandidate>()

	for (const candidate of candidates) {
		const existing = bySlug.get(candidate.slug)

		if (!existing) {
			bySlug.set(candidate.slug, {
				...candidate,
				displayName: normalizePropertyDisplayName(candidate.displayName),
			})
			continue
		}

		bySlug.set(candidate.slug, {
			displayName: existing.displayName,
			slug: existing.slug,
			folderPaths: [
				...new Set([...existing.folderPaths, ...candidate.folderPaths]),
			],
			documentIds: [
				...new Set([...existing.documentIds, ...candidate.documentIds]),
			],
			ownerMemberIds: [
				...new Set([...existing.ownerMemberIds, ...candidate.ownerMemberIds]),
			],
		})
	}

	return [...bySlug.values()]
}

export function resolveOwnershipFromEvidence(input: {
	ownerMemberIds: string[]
	members: FamilyMemberWithAliases[]
	explicitOwnership?: PropertyOwnership | null
}): PropertyOwnership {
	if (input.explicitOwnership && input.explicitOwnership !== 'unknown') {
		return input.explicitOwnership
	}

	const uniqueOwners = [...new Set(input.ownerMemberIds.filter(Boolean))]

	if (uniqueOwners.length === 0) {
		return 'unknown'
	}

	if (uniqueOwners.length === 1) {
		return 'individual'
	}

	if (uniqueOwners.length >= 2) {
		return 'joint'
	}

	return 'unknown'
}

export function resolvePropertyResolutionState(input: {
	displayName: string
	documentCount: number
	ownership: PropertyOwnership
}): PropertyResolutionState {
	if (input.documentCount === 0) {
		return 'unresolved'
	}

	if (input.displayName === 'Other Property') {
		return 'ambiguous'
	}

	if (input.ownership === 'unknown' && input.documentCount > 0) {
		return 'ambiguous'
	}

	return 'resolved'
}

export function formatOwnershipLabel(input: {
	ownership: PropertyOwnership
	ownerNames: string[]
}): string {
	switch (input.ownership) {
		case 'individual':
			return input.ownerNames[0] ?? 'Individual'
		case 'joint':
			return input.ownerNames.length > 0
				? input.ownerNames.join(' + ')
				: 'Joint'
		case 'family':
			return 'Family'
		default:
			return 'Unknown'
	}
}

export function createPropertyRecordStub(input: {
	candidate: PropertyEntityCandidate
	propertyType: PropertyRecord['propertyType']
	propertyTypeLabel: string
	ownership: PropertyOwnership
	ownerNames: string[]
	city: string | null
}): PropertyRecord {
	const resolutionState = resolvePropertyResolutionState({
		displayName: input.candidate.displayName,
		documentCount: input.candidate.documentIds.length,
		ownership: input.ownership,
	})

	return {
		id: input.candidate.slug,
		slug: input.candidate.slug,
		displayName: input.candidate.displayName,
		propertyType: input.propertyType,
		propertyTypeLabel: input.propertyTypeLabel,
		address: null,
		city: input.city,
		ownership: input.ownership,
		ownerMemberIds: input.candidate.ownerMemberIds,
		ownerNames: input.ownerNames,
		purchaseDate: null,
		possessionDate: null,
		registrationDate: null,
		societyName: null,
		status: 'unknown',
		documentCount: input.candidate.documentIds.length,
		facts: [],
		references: [],
		sourceDocumentIds: input.candidate.documentIds,
		resolutionState,
	}
}
