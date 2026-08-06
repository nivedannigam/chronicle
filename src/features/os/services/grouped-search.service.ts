import {
	familyMemberPath,
	documentPath,
	healthReportPath,
	ROUTES,
} from '@/constants/routes'
import type { FamilyMemberWithAliases } from '@/features/family/types/family.types'
import type {
	GroupedSearchResult,
	GroupedSearchSection,
} from '@/features/os/types/os.types'
import type { SemanticSearchHit } from '@/features/intelligence/types/intelligence.types'

function hitToResult(hit: SemanticSearchHit): GroupedSearchResult {
	let path = `${ROUTES.ask}?q=${encodeURIComponent(hit.title)}`

	if (hit.domain === 'documents' && hit.reportId) {
		path = documentPath(hit.reportId)
	} else if (hit.domain === 'health' && hit.reportId) {
		path = healthReportPath(hit.reportId)
	} else if (hit.domain === 'insurance' && hit.reportId) {
		path = `${ROUTES.insurancePolicies}/${hit.reportId}`
	} else if (hit.domain === 'photos') {
		path = ROUTES.timeline
	}

	return {
		id: hit.id,
		title: hit.title,
		subtitle: hit.snippet,
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
				: hit.domain === 'insurance' || hit.domain === 'health'
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
			results: documentHits.map(hitToResult),
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
			results: moduleHits.map(hitToResult),
		})
	}

	const timelineHits = byDomain.get('timeline') ?? []
	if (timelineHits.length > 0) {
		sections.push({
			id: 'timeline',
			label: 'Timeline',
			emoji: '🕐',
			results: timelineHits.map(hitToResult),
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
