import {
	isPolicyDisplayReady,
	isPolicyExpiringSoon,
} from '@/features/insurance-knowledge/services/insurance-knowledge-builder'
import type { InsuranceCoverageSnapshot } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import type {
	InsuranceDocumentRecord,
	InsurancePolicyRecord,
} from '@/features/insurance-knowledge/types/insurance-record.types'

const PROCESSING_STATUSES = new Set([
	'uploaded',
	'queued',
	'processing',
	'parsed',
	'indexing',
])

export function buildInsuranceCoverageSnapshot(input: {
	policies: InsurancePolicyRecord[]
	documents: InsuranceDocumentRecord[]
	importRegistryCount?: number
}): InsuranceCoverageSnapshot {
	const discoveredCount = input.importRegistryCount ?? input.documents.length
	const displayReadyPolicies = input.policies.filter(isPolicyDisplayReady)
	const displayReadyCount = displayReadyPolicies.length
	const activePolicyCount = input.policies.filter(
		(policy) => policy.status === 'active',
	).length
	const expiringCount = input.policies.filter(isPolicyExpiringSoon).length
	const lapsedCount = input.policies.filter(
		(policy) =>
			policy.status === 'lapsed' ||
			policy.status === 'expired' ||
			policy.status === 'cancelled',
	).length
	const failedCount = input.documents.filter(
		(document) => document.status === 'failed',
	).length
	const processingCount = input.documents.filter((document) =>
		PROCESSING_STATUSES.has(document.status),
	).length
	const policiesNeedingReprocess = input.policies
		.filter(
			(policy) =>
				!isPolicyDisplayReady(policy) ||
				policy.confidence < 0.5 ||
				policy.sumInsured == null,
		)
		.map((policy) => policy.id)

	let corpusCompleteness: InsuranceCoverageSnapshot['corpusCompleteness'] =
		'empty'

	if (displayReadyCount > 0 && displayReadyCount >= discoveredCount) {
		corpusCompleteness = 'complete'
	} else if (displayReadyCount > 0 || input.policies.length > 0) {
		corpusCompleteness = 'partial'
	}

	return {
		discoveredCount,
		displayReadyCount,
		activePolicyCount,
		expiringCount,
		lapsedCount,
		failedCount,
		processingCount,
		corpusCompleteness,
		policiesNeedingReprocess,
	}
}

export function aggregateCoverageByCategory(
	graph: import('@/features/insurance-knowledge/types/insurance-knowledge.types').InsuranceKnowledgeGraph,
): import('@/features/insurance-knowledge/types/insurance-knowledge-object.types').InsuranceKnowledgeCategorySnapshot[] {
	return graph.profile.categories.map((category) => ({
		categoryId: category.categoryId,
		name: category.name,
		emoji: category.emoji,
		color: category.color,
		policyCount: category.policyCount,
		activePolicyCount: category.activePolicyCount,
		totalSumInsured: category.totalSumInsured,
		currency: category.currency,
		statusLabel: category.statusLabel,
		lastUpdated: category.lastUpdated,
	}))
}
