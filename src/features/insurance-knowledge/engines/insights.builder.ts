import type {
	InsuranceKnowledgeClaim,
	InsuranceKnowledgeInsight,
	InsuranceKnowledgePolicy,
	InsuranceKnowledgeRecommendation,
} from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceKnowledgeGraph } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import type { InsuranceCoverageSnapshot } from '@/features/insurance-knowledge/types/insurance-knowledge.types'

export function buildKnowledgeInsights(input: {
	graph: InsuranceKnowledgeGraph
	policies: InsuranceKnowledgePolicy[]
	coverage: InsuranceCoverageSnapshot
}): InsuranceKnowledgeInsight[] {
	const insights: InsuranceKnowledgeInsight[] = []

	for (const derived of input.graph.profile.insights) {
		insights.push({
			id: derived.id,
			text: derived.text,
			tone: derived.tone,
			policyId: derived.policyId,
			evidenceIds: derived.policyId ? [`policy-${derived.policyId}`] : [],
		})
	}

	for (const alert of input.graph.profile.alerts) {
		insights.push({
			id: alert.id,
			text: alert.message,
			tone: alert.severity === 'critical' ? 'warning' : 'neutral',
			policyId: alert.policyId,
			evidenceIds: [`policy-${alert.policyId}`],
		})
	}

	for (const gap of input.graph.profile.coverageGaps.slice(0, 3)) {
		insights.push({
			id: gap.id,
			text: gap.message,
			tone: gap.severity === 'critical' ? 'warning' : 'neutral',
			evidenceIds: [`gap-${gap.categoryId}`],
		})
	}

	if (input.coverage.displayReadyCount === 0) {
		insights.push({
			id: 'insight-no-data',
			text: 'Import insurance documents to unlock protection insights.',
			tone: 'neutral',
			evidenceIds: [],
		})
	}

	return dedupeInsights(insights).slice(0, 12)
}

export function buildKnowledgeRecommendations(input: {
	policies: InsuranceKnowledgePolicy[]
	claims: InsuranceKnowledgeClaim[]
	coverage: InsuranceCoverageSnapshot
	limitationCodes: Set<string>
	gaps: InsuranceKnowledgeGraph['profile']['coverageGaps']
}): InsuranceKnowledgeRecommendation[] {
	const recommendations: InsuranceKnowledgeRecommendation[] = []

	for (const gap of input.gaps.slice(0, 3)) {
		recommendations.push({
			id: `rec-gap-${gap.id}`,
			text: gap.recommendation,
			priority: gap.severity === 'critical' ? 'high' : 'medium',
			evidenceIds: [`gap-${gap.categoryId}`],
		})
	}

	if (input.coverage.policiesNeedingReprocess.length > 0) {
		recommendations.push({
			id: 'rec-reprocess',
			text: 'Reprocess policies with incomplete extraction to improve coverage knowledge.',
			priority: 'high',
			evidenceIds: input.coverage.policiesNeedingReprocess.map(
				(id) => `policy-${id}`,
			),
		})
	}

	if (input.coverage.failedCount > 0) {
		recommendations.push({
			id: 'rec-import-failures',
			text: 'Review Import Center for failed insurance documents and retry.',
			priority: 'high',
			evidenceIds: ['coverage-import-failures'],
		})
	}

	const expiring = input.policies.filter((policy) => policy.isExpiringSoon)

	for (const policy of expiring.slice(0, 2)) {
		recommendations.push({
			id: `rec-renewal-${policy.id}`,
			text: `Renew ${policy.productName ?? policy.policyNumber} before expiry.`,
			priority: 'high',
			evidenceIds: [`policy-${policy.id}`],
		})
	}

	const openClaims = input.claims.filter(
		(claim) => claim.status === 'filed' || claim.status === 'processing',
	)

	for (const claim of openClaims.slice(0, 2)) {
		recommendations.push({
			id: `rec-claim-${claim.id}`,
			text: `Follow up on claim ${claim.claimNumber}.`,
			priority: 'medium',
			evidenceIds: [`claim-${claim.id}`, `policy-${claim.policyId}`],
		})
	}

	if (input.limitationCodes.has('single_policy')) {
		recommendations.push({
			id: 'rec-portfolio',
			text: 'Import additional policy types to build a complete protection picture.',
			priority: 'low',
			evidenceIds: ['coverage-single-policy'],
		})
	}

	return recommendations.slice(0, 8)
}

function dedupeInsights(
	insights: InsuranceKnowledgeInsight[],
): InsuranceKnowledgeInsight[] {
	const seen = new Set<string>()
	const result: InsuranceKnowledgeInsight[] = []

	for (const insight of insights) {
		if (seen.has(insight.id)) {
			continue
		}

		seen.add(insight.id)
		result.push(insight)
	}

	return result
}
