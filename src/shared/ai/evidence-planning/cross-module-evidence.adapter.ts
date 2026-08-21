import type { EvidenceBundle } from '@/shared/ai/evidence-planning/types'
import type {
	CrossModuleEvidenceBundle,
	CrossModuleEvidenceConflict,
	CrossModuleEvidenceItem,
} from '@/shared/ai/evidence-planning/cross-module-evidence.types'
import type { KnowledgeDomainId } from '@/shared/ai/types/ai-platform.types'

function moduleLabel(domain: KnowledgeDomainId | 'documents'): string {
	switch (domain) {
		case 'health':
			return 'Health'
		case 'insurance':
			return 'Insurance'
		case 'vehicles':
			return 'Vehicles'
		case 'identity':
			return 'Identity'
		case 'finance':
			return 'Finance'
		case 'property':
			return 'Property'
		default:
			return 'Documents'
	}
}

export function evidenceBundleToCrossModuleItems(input: {
	domain: KnowledgeDomainId
	bundle: EvidenceBundle
	defaultEntity?: string | null
}): CrossModuleEvidenceItem[] {
	const items: CrossModuleEvidenceItem[] = []
	const entity = input.defaultEntity ?? moduleLabel(input.domain)

	for (const metric of input.bundle.metrics) {
		items.push({
			module: input.domain,
			entity,
			fact: metric.displayName,
			value: `${metric.value}${metric.unit ? ` ${metric.unit}` : ''}`,
			observedAt: metric.observedAt,
			sourceDocument: metric.reportTitle,
			confidence: metric.status === 'normal' ? 'high' : 'medium',
			scope: metric.categoryId ?? null,
			provenance: `${moduleLabel(input.domain)} metric record`,
		})
	}

	for (const line of input.bundle.summary.lines) {
		items.push({
			module: input.domain,
			entity,
			fact: input.bundle.summary.headline || 'Summary',
			value: line,
			observedAt: null,
			sourceDocument: null,
			confidence: 'medium',
			scope: null,
			provenance: `${moduleLabel(input.domain)} knowledge`,
		})
	}

	return items
}

function conflictKey(item: CrossModuleEvidenceItem): string {
	return `${item.entity}:${item.fact}`.toLowerCase()
}

export function detectEvidenceConflicts(
	items: CrossModuleEvidenceItem[],
): CrossModuleEvidenceConflict[] {
	const byKey = new Map<string, CrossModuleEvidenceItem[]>()

	for (const item of items) {
		if (!item.observedAt) {
			continue
		}

		const key = conflictKey(item)
		const bucket = byKey.get(key) ?? []
		bucket.push(item)
		byKey.set(key, bucket)
	}

	const conflicts: CrossModuleEvidenceConflict[] = []

	for (const [key, bucket] of byKey.entries()) {
		const uniqueValues = [...new Set(bucket.map((item) => item.value))]

		if (uniqueValues.length <= 1) {
			continue
		}

		conflicts.push({
			fact: bucket[0]?.fact ?? key,
			entity: bucket[0]?.entity ?? 'Record',
			items: bucket,
		})
	}

	return conflicts
}

export function mergeCrossModuleEvidence(input: {
	domainBundles: Array<{
		domain: KnowledgeDomainId
		bundle: EvidenceBundle
		entity?: string | null
	}>
}): CrossModuleEvidenceBundle {
	const items = input.domainBundles.flatMap((entry) =>
		evidenceBundleToCrossModuleItems({
			domain: entry.domain,
			bundle: entry.bundle,
			defaultEntity: entry.entity,
		}),
	)

	const limitations = [
		...new Set(
			input.domainBundles.flatMap((entry) => entry.bundle.summary.limitations),
		),
	]
	const conflicts = detectEvidenceConflicts(items)
	const summaryLines = input.domainBundles.flatMap(
		(entry) => entry.bundle.summary.lines,
	)
	const headline =
		input.domainBundles.length === 1
			? (input.domainBundles[0]?.bundle.summary.headline ?? null)
			: 'Cross-module summary'

	return {
		items,
		limitations,
		conflicts,
		headline,
		summaryLines,
	}
}

export function formatEvidenceCitations(
	items: CrossModuleEvidenceItem[],
): string[] {
	return items
		.filter((item) => item.sourceDocument)
		.slice(0, 4)
		.map((item) => {
			const dateSuffix = item.observedAt ? ` — ${item.observedAt}` : ''
			return `• ${item.entity} — ${item.sourceDocument}${dateSuffix}`
		})
}
