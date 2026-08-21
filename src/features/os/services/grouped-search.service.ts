import {
	familyMemberPath,
	documentPath,
	healthReportPath,
	identityDocumentPath,
	identityMemberPath,
	insurancePolicyDetailPath,
	ROUTES,
	vehicleDetailPath,
} from '@/constants/routes'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type {
	GroupedSearchResult,
	GroupedSearchSection,
} from '@/features/os/types/os.types'
import type { SemanticSearchHit } from '@/features/intelligence/types/intelligence.types'

const DOCUMENT_CATEGORY_MODULE_LABELS: Record<string, string> = {
	medical: 'Health',
	insurance: 'Insurance',
	identity: 'Identity',
	vehicles: 'Vehicles',
	property: 'Property',
	financial: 'Finance',
	employment: 'Employment',
	travel: 'Travel',
	education: 'Education',
	personal: 'Documents',
	other: 'Documents',
}

function domainModuleLabel(domain: SemanticSearchHit['domain']): string {
	switch (domain) {
		case 'health':
			return 'Health'
		case 'insurance':
			return 'Insurance'
		case 'vehicles':
			return 'Vehicles'
		case 'documents':
			return 'Documents'
		case 'photos':
			return 'Timeline'
		case 'finance':
			return 'Finance'
		case 'identity':
			return 'Identity'
		case 'travel':
			return 'Travel'
		case 'mail':
			return 'Mail'
		default:
			return 'Chronicle'
	}
}

function resolveMemberLabel(
	memberId: string | null | undefined,
	members: FamilyMemberWithAliases[],
): string | null {
	if (!memberId) {
		return null
	}

	return members.find((member) => member.id === memberId)?.displayName ?? null
}

function resolveSearchEntityLabel(
	hit: SemanticSearchHit,
	members: FamilyMemberWithAliases[],
): string {
	const memberLabel = resolveMemberLabel(hit.memberId, members)
	if (memberLabel) {
		return memberLabel
	}

	if (hit.domain === 'vehicles') {
		if (hit.title.includes(' · ')) {
			return hit.title.split(' · ')[0]?.trim() || hit.title
		}

		return hit.title
	}

	if (hit.domain === 'insurance') {
		if (hit.reportType === 'claim') {
			return 'Claim'
		}

		return 'Family'
	}

	if (hit.domain === 'finance') {
		return hit.title || 'Document'
	}

	if (hit.domain === 'identity') {
		if (hit.kind === 'entity') {
			return hit.title
		}

		const memberLabel = resolveMemberLabel(hit.memberId, members)
		return memberLabel ?? hit.title
	}

	if (hit.domain === 'documents') {
		return 'Family'
	}

	if (hit.domain === 'health') {
		return 'Family'
	}

	return 'Family'
}

export function buildSearchResultContextLabel(
	hit: SemanticSearchHit,
	members: FamilyMemberWithAliases[],
): string {
	const moduleLabel =
		hit.domain === 'documents'
			? (DOCUMENT_CATEGORY_MODULE_LABELS[hit.reportType ?? ''] ?? 'Documents')
			: domainModuleLabel(hit.domain)

	const entityLabel = resolveSearchEntityLabel(hit, members)

	return `${moduleLabel} · ${entityLabel}`
}

function hitToResult(
	hit: SemanticSearchHit,
	members: FamilyMemberWithAliases[],
): GroupedSearchResult {
	let path = `${ROUTES.ask}?q=${encodeURIComponent(hit.title)}`

	if (hit.domain === 'documents' && hit.reportId) {
		path = documentPath(hit.reportId)
	} else if (hit.domain === 'health' && hit.reportId) {
		path = healthReportPath(hit.reportId)
	} else if (hit.domain === 'insurance' && hit.reportId) {
		path =
			hit.reportType === 'claim'
				? `${ROUTES.insuranceClaims}/${hit.reportId}`
				: insurancePolicyDetailPath(hit.reportId)
	} else if (hit.domain === 'vehicles' && hit.kind === 'entity' && hit.title) {
		const slug = hit.title
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
		if (slug) {
			path = vehicleDetailPath(slug)
		}
	} else if (hit.domain === 'finance' && hit.reportId) {
		path = documentPath(hit.reportId)
	} else if (
		hit.domain === 'identity' &&
		hit.kind === 'entity' &&
		hit.reportId
	) {
		path = identityMemberPath(hit.reportId)
	} else if (hit.domain === 'identity' && hit.reportId) {
		path = identityDocumentPath(hit.reportId)
	} else if (hit.domain === 'photos') {
		path = ROUTES.timeline
	}

	const contextLabel = buildSearchResultContextLabel(hit, members)

	return {
		id: hit.id,
		title: hit.title,
		subtitle: contextLabel,
		path,
		domain: hit.domain,
		score: hit.score,
	}
}

function buildPeopleSection(
	query: string,
	members: FamilyMemberWithAliases[],
): GroupedSearchSection | null {
	const normalized = query.trim().toLowerCase()
	if (!normalized) {
		return null
	}

	const matches = members.filter((member) => {
		const haystack = [
			member.displayName,
			member.relationship,
			...(member.aliases ?? []),
		]
			.join(' ')
			.toLowerCase()

		return haystack.includes(normalized)
	})

	if (matches.length === 0) {
		return null
	}

	return {
		id: 'people',
		label: 'People',
		emoji: '👨‍👩‍👧',
		results: matches.map((member) => ({
			id: `person-${member.id}`,
			title: member.displayName,
			subtitle: member.relationship,
			path: familyMemberPath(member.id),
			domain: 'family',
		})),
	}
}

export function groupSearchResults(input: {
	query: string
	hits: SemanticSearchHit[]
	members: FamilyMemberWithAliases[]
}): GroupedSearchSection[] {
	const trimmed = input.query.trim()
	if (!trimmed) {
		return []
	}

	const sections: GroupedSearchSection[] = []
	const byDomain = new Map<string, SemanticSearchHit[]>()

	for (const hit of input.hits) {
		const key =
			hit.domain === 'photos'
				? 'timeline'
				: hit.domain === 'insurance' ||
					  hit.domain === 'health' ||
					  hit.domain === 'vehicles' ||
					  hit.domain === 'identity'
					? 'modules'
					: hit.domain

		const bucket = byDomain.get(key) ?? []
		bucket.push(hit)
		byDomain.set(key, bucket)
	}

	const documentHits = byDomain.get('documents') ?? []
	if (documentHits.length > 0) {
		sections.push({
			id: 'documents',
			label: 'Documents',
			emoji: '📄',
			results: documentHits.map((hit) => hitToResult(hit, input.members)),
		})
	}

	const moduleHits = [
		...(byDomain.get('modules') ?? []),
		...(byDomain.get('finance') ?? []),
		...(byDomain.get('travel') ?? []),
		...(byDomain.get('mail') ?? []),
	]
	if (moduleHits.length > 0) {
		sections.push({
			id: 'modules',
			label: 'Modules',
			emoji: '🧩',
			results: moduleHits.map((hit) => hitToResult(hit, input.members)),
		})
	}

	const timelineHits = byDomain.get('timeline') ?? []
	if (timelineHits.length > 0) {
		sections.push({
			id: 'timeline',
			label: 'Timeline',
			emoji: '🕐',
			results: timelineHits.map((hit) => hitToResult(hit, input.members)),
		})
	}

	const peopleSection = buildPeopleSection(trimmed, input.members)
	if (peopleSection) {
		sections.push(peopleSection)
	}

	if (sections.length === 0 && trimmed.length > 2) {
		sections.push({
			id: 'ask',
			label: 'Ask Chronicle',
			emoji: '✨',
			results: [
				{
					id: `ask-${trimmed}`,
					title: `Ask about "${trimmed}"`,
					subtitle: 'Chronicle will search all your records',
					path: `${ROUTES.ask}?q=${encodeURIComponent(trimmed)}`,
					domain: 'ask',
				},
			],
		})
	}

	return sections
}

export { domainModuleLabel }
