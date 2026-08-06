import { resolveMemberDisplayName } from '@/features/family/utils/member-display'
import { buildKnowledgeConfidence } from '@/features/insurance-knowledge/engines/confidence.model'
import {
	aggregateCoverageByCategory,
	buildInsuranceCoverageSnapshot,
} from '@/features/insurance-knowledge/engines/coverage-aggregation.engine'
import {
	computeDaysUntilExpiry,
	isExpiringSoon,
	partitionRankedPolicies,
	rankInsurancePolicies,
	type RankablePolicyInput,
} from '@/features/insurance-knowledge/engines/evidence-ranking.engine'
import {
	buildKnowledgeInsights,
	buildKnowledgeRecommendations,
} from '@/features/insurance-knowledge/engines/insights.builder'
import { buildKnowledgeLimitations } from '@/features/insurance-knowledge/engines/limitations.builder'
import {
	buildDeterministicSummary,
	buildKnowledgeTimeline,
} from '@/features/insurance-knowledge/engines/knowledge-summary.builder'
import { logInsuranceKnowledgeBuild } from '@/features/insurance-knowledge/observability/knowledge-observability'
import {
	defaultInsuranceKnowledgeDataSource,
	filterRawDataForMember,
	type InsuranceKnowledgeDataSource,
	type InsuranceKnowledgeRawData,
} from '@/features/insurance-knowledge/providers/insurance-knowledge-data-source'
import { buildInsuranceKnowledgeGraph } from '@/features/insurance-knowledge/services/insurance-knowledge-builder'
import { isPolicyDisplayReady } from '@/features/insurance-knowledge/services/insurance-knowledge-builder'
import { mergeInsuranceRecords } from '@/features/insurance-knowledge/services/merge-insurance-records'
import { computeProtectionScoreFromHistories } from '@/features/insurance-knowledge/services/insurance-scoring.service'
import { mapPolicyTypeToCategoryId } from '@/features/insurance-knowledge/graph/policy-categories'
import { resolvePolicyCategoryId } from '@/features/insurance-knowledge/utils/policy-category-resolver'
import type {
	InsuranceKnowledge,
	InsuranceKnowledgeClaim,
	InsuranceKnowledgeCoverageGap,
	InsuranceKnowledgeFamilyMember,
	InsuranceKnowledgeGetInput,
	InsuranceKnowledgeRelationship,
	InsuranceKnowledgeSource,
} from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceKnowledgeGraph } from '@/features/insurance-knowledge/types'
import type {
	InsuranceInsurerRecord,
	InsurancePolicyRecord,
} from '@/features/insurance-knowledge/types/insurance-record.types'

function resolveInsurerName(
	insurerId: string,
	insurers: InsuranceInsurerRecord[],
): string {
	return (
		insurers.find((insurer) => insurer.id === insurerId)?.displayName ??
		insurerId
	)
}

function toRankablePolicy(
	policy: InsurancePolicyRecord,
	insurers: InsuranceInsurerRecord[],
): RankablePolicyInput {
	const daysUntilExpiry = computeDaysUntilExpiry(
		policy.expiryDate,
		policy.renewalDate,
	)

	return {
		id: policy.id,
		policyNumber: policy.policyNumber,
		policyType: policy.policyType,
		categoryId: resolvePolicyCategoryId({ policyType: policy.policyType }),
		productName: policy.productName,
		insurerId: policy.insurerId,
		insurerName: resolveInsurerName(policy.insurerId, insurers),
		status: policy.status,
		inceptionDate: policy.inceptionDate,
		expiryDate: policy.expiryDate,
		renewalDate: policy.renewalDate,
		sumInsured: policy.sumInsured,
		currency: policy.currency,
		isDisplayReady: isPolicyDisplayReady(policy),
		needsReprocess:
			!isPolicyDisplayReady(policy) ||
			policy.confidence < 0.5 ||
			policy.sumInsured == null,
		daysUntilExpiry,
		isExpiringSoon: isExpiringSoon(daysUntilExpiry),
		extractionMethod: policy.extractionMethod,
		confidence: policy.confidence,
		sourceDocumentIds: policy.sourceDocumentIds,
	}
}

function resolveFamilyMember(
	raw: InsuranceKnowledgeRawData,
	input: InsuranceKnowledgeGetInput,
): InsuranceKnowledgeFamilyMember {
	const member =
		input.familyMemberId != null
			? raw.familyMembers.find((item) => item.id === input.familyMemberId)
			: raw.familyMembers.find((item) => item.isAccountOwner)

	return {
		id: member?.id ?? input.familyMemberId ?? null,
		displayName: member
			? resolveMemberDisplayName({
					memberDisplayName: member.displayName,
					isAccountOwner: member.isAccountOwner,
				})
			: 'Account owner',
		relationship: member?.relationship ?? 'self',
		isAccountOwner: member?.isAccountOwner ?? true,
		dateOfBirth: member?.dateOfBirth ?? null,
	}
}

function buildSources(input: {
	policies: InsuranceKnowledge['policies']
	claims: InsuranceKnowledgeClaim[]
	documents: InsuranceKnowledge['documents']
}): InsuranceKnowledgeSource[] {
	const sources: InsuranceKnowledgeSource[] = []

	for (const policy of input.policies.slice(0, 12)) {
		sources.push({
			type: 'insurance_policy',
			id: policy.id,
			label: policy.productName ?? policy.policyNumber,
			date: policy.renewalDate ?? policy.expiryDate ?? undefined,
		})
	}

	for (const document of input.documents.slice(0, 12)) {
		sources.push({
			type: 'insurance_document',
			id: document.id,
			label: document.fileName,
			date: document.uploadedAt,
		})
	}

	for (const claim of input.claims.slice(0, 8)) {
		sources.push({
			type: 'insurance_claim',
			id: claim.id,
			label: claim.claimNumber,
			date: claim.filedDate ?? undefined,
		})
	}

	return sources
}

function mapCoverageGaps(
	graph: InsuranceKnowledgeGraph,
): InsuranceKnowledgeCoverageGap[] {
	return graph.profile.coverageGaps.map((gap) => ({
		id: gap.id,
		categoryId: gap.categoryId,
		categoryName: gap.categoryName,
		severity: gap.severity,
		message: gap.message,
		recommendation: gap.recommendation,
		evidenceIds: [`gap-${gap.categoryId}`],
	}))
}

function mapRelationships(
	graph: InsuranceKnowledgeGraph,
): InsuranceKnowledgeRelationship[] {
	return graph.profile.relationships.map((relationship) => ({
		id: relationship.id,
		fromEntityId: relationship.fromEntityId,
		fromEntityType: relationship.fromEntityType,
		toEntityId: relationship.toEntityId,
		toEntityType: relationship.toEntityType,
		relationshipType: relationship.relationshipType,
		label: relationship.label,
	}))
}

/**
 * Production insurance knowledge provider.
 * Owns all retrieval, joins, ranking, and assembly for the Insurance domain.
 */
export class InsuranceKnowledgeProvider {
	private readonly dataSource: InsuranceKnowledgeDataSource

	constructor(
		dataSource: InsuranceKnowledgeDataSource = defaultInsuranceKnowledgeDataSource,
	) {
		this.dataSource = dataSource
	}

	async getKnowledge(
		input: InsuranceKnowledgeGetInput,
	): Promise<InsuranceKnowledge> {
		const started = performance.now()
		const raw = await this.dataSource.fetchRawData(input)
		return this.buildFromRawData(raw, input, started)
	}

	buildFromRawData(
		raw: InsuranceKnowledgeRawData,
		input: InsuranceKnowledgeGetInput,
		startedAt = performance.now(),
	): InsuranceKnowledge {
		const memberRecords = filterRawDataForMember(raw, input)
		const merged = mergeInsuranceRecords(memberRecords)

		const coverage = buildInsuranceCoverageSnapshot({
			policies: merged.policies,
			documents: merged.documents,
			importRegistryCount: raw.importRegistry.length,
		})

		const graph = buildInsuranceKnowledgeGraph({
			personId: input.userId,
			...merged,
		})

		const policies = rankInsurancePolicies(
			merged.policies.map((policy) =>
				toRankablePolicy(policy, merged.insurers),
			),
		)
		const partitions = partitionRankedPolicies(policies)
		const protectionScore = computeProtectionScoreFromHistories(
			graph.profile.policyHistories,
		)

		const coverages = merged.coverages.map((item) => ({
			id: item.id,
			policyId: item.policyId,
			canonicalCoverageId: item.canonicalCoverageId,
			displayName: item.displayName,
			sumInsured: item.sumInsured,
			sublimit: item.sublimit,
			deductible: item.deductible,
			copay: item.copay,
			waitingPeriodDays: item.waitingPeriodDays,
			status: item.status,
		}))

		const claims: InsuranceKnowledgeClaim[] = merged.claims.map((claim) => ({
			id: claim.id,
			policyId: claim.policyId,
			claimNumber: claim.claimNumber,
			claimType: claim.claimType,
			filedDate: claim.filedDate,
			settledDate: claim.settledDate,
			claimedAmount: claim.claimedAmount,
			approvedAmount: claim.approvedAmount,
			status: claim.status,
			providerName: claim.providerName,
			priority:
				claim.status === 'filed' || claim.status === 'processing'
					? 'high'
					: 'medium',
		}))

		const documents = merged.documents.map((document) => ({
			id: document.id,
			fileName: document.fileName,
			documentKind: document.documentKind,
			status: document.status,
			linkedPolicyIds: document.linkedPolicyIds,
			uploadedAt: document.uploadedAt,
			isDisplayReady: document.status === 'completed',
		}))

		const limitations = buildKnowledgeLimitations({
			policies,
			coverage,
			documents: merged.documents,
			processingCount: coverage.processingCount,
		})

		const limitationCodes = new Set(limitations.map((item) => item.code))
		const insights = buildKnowledgeInsights({ graph, policies, coverage })
		const recommendations = buildKnowledgeRecommendations({
			policies,
			claims,
			coverage,
			limitationCodes,
			gaps: graph.profile.coverageGaps,
		})

		const timeline = buildKnowledgeTimeline({
			policies,
			claims,
			documents: merged.documents,
			graph,
		})

		const summary = buildDeterministicSummary({
			policies,
			activePolicies: partitions.active,
			expiringPolicies: partitions.expiring,
			claims,
		})

		const confidence = buildKnowledgeConfidence({
			policies,
			documents: merged.documents,
			displayReadyCount: coverage.displayReadyCount,
		})

		const buildDurationMs = Math.round(performance.now() - startedAt)

		const knowledge: InsuranceKnowledge = {
			holder: { userId: input.userId },
			familyMember: resolveFamilyMember(raw, input),
			policies,
			activePolicies: partitions.active,
			expiringPolicies: partitions.expiring,
			lapsedPolicies: partitions.lapsed,
			coverages,
			claims,
			members: merged.members,
			nominees: merged.nominees,
			insurers: merged.insurers.map((insurer) => ({
				id: insurer.id,
				canonicalName: insurer.canonicalName,
				displayName: insurer.displayName,
				country: insurer.country ?? null,
			})),
			premiums: merged.premiums,
			renewals: merged.renewals,
			benefits: merged.benefits,
			exclusions: merged.exclusions,
			documents,
			relationships: mapRelationships(graph),
			coverageGaps: mapCoverageGaps(graph),
			coverageByCategory: aggregateCoverageByCategory(graph),
			protectionScore,
			timeline,
			insights,
			recommendations,
			confidence,
			limitations,
			sources: buildSources({ policies, claims, documents }),
			summary,
			generatedAt: new Date().toISOString(),
			buildDurationMs,
		}

		logInsuranceKnowledgeBuild({
			buildDurationMs,
			policiesProcessed: merged.policies.length,
			documentsProcessed: merged.documents.length,
			activePolicyCount: partitions.active.length,
			expiringCount: partitions.expiring.length,
			timelineEvents: timeline.length,
			confidenceOverall: confidence.overall,
			userId: input.userId,
			familyMemberId: input.familyMemberId ?? null,
		})

		return knowledge
	}
}

export const insuranceKnowledgeProvider = new InsuranceKnowledgeProvider()

export function insuranceKnowledgeToPayload(
	knowledge: InsuranceKnowledge,
): Record<string, unknown> {
	return {
		policies: knowledge.policies.map((policy) => ({
			id: policy.id,
			policyNumber: policy.policyNumber,
			policyType: policy.policyType,
			categoryId: mapPolicyTypeToCategoryId(policy.policyType),
			productName: policy.productName,
			insurerName: policy.insurerName,
			status: policy.status,
			sumInsured: policy.sumInsured,
			currency: policy.currency,
			expiryDate: policy.expiryDate,
			renewalDate: policy.renewalDate,
			isExpiringSoon: policy.isExpiringSoon,
		})),
		coverages: knowledge.coverages,
		claims: knowledge.claims,
		coverageGaps: knowledge.coverageGaps.map((gap) => gap.message),
		insights: knowledge.insights.map((insight) => insight.text),
		recommendations: knowledge.recommendations.map(
			(recommendation) => recommendation.text,
		),
		summaryLines: knowledge.summary.lines,
		protectionScore: knowledge.protectionScore,
	}
}
