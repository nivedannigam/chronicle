import { buildDerivedInsights } from '@/features/insurance-knowledge/engines/insights.engine'
import { buildPolicyRelationships } from '@/features/insurance-knowledge/engines/relationship.engine'
import { detectCoverageGaps } from '@/features/insurance-knowledge/engines/gap-detection.engine'
import {
	getCategoryMeta,
	getPolicyCategories,
	mapPolicyTypeToCategoryId,
} from '@/features/insurance-knowledge/graph/policy-categories'
import { mergeInsuranceRecords } from '@/features/insurance-knowledge/services/merge-insurance-records'
import type { KnowledgeGraphBuilder } from '@chronicle/core-knowledge'
import type {
	BuildInsuranceKnowledgeInput,
	CategorySnapshot,
	InsuranceAlert,
	InsuranceKnowledgeGraph,
	PersonInsuranceProfile,
	PolicyHistory,
	PolicyCategoryId,
} from '@/features/insurance-knowledge/types'
import type {
	InsurancePolicyRecord,
	InsurancePolicyStatus,
} from '@/features/insurance-knowledge/types/insurance-record.types'

const CACHE_VERSION = '1'
const EXPIRING_SOON_DAYS = 30

function formatDisplayDate(value: string | null | undefined): string {
	if (!value) {
		return '—'
	}

	return new Date(value).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}

function daysUntil(date: string | null): number | null {
	if (!date) {
		return null
	}

	const target = new Date(date)
	const now = new Date()
	const diffMs = target.getTime() - now.getTime()

	return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

function isExpiringSoon(policy: InsurancePolicyRecord): boolean {
	if (policy.status !== 'active') {
		return false
	}

	const days = daysUntil(policy.expiryDate ?? policy.renewalDate)

	return days != null && days >= 0 && days <= EXPIRING_SOON_DAYS
}

function summarizeCategoryStatus(policies: InsurancePolicyRecord[]): string {
	if (policies.length === 0) {
		return 'No coverage'
	}

	const active = policies.filter((policy) => policy.status === 'active')

	if (active.length === 0) {
		return 'No active policy'
	}

	const expiring = active.filter(isExpiringSoon)

	if (expiring.length > 0) {
		return `${expiring.length} renewing soon`
	}

	return 'Protected'
}

function buildPolicyHistories(
	input: BuildInsuranceKnowledgeInput,
): PolicyHistory[] {
	const merged = mergeInsuranceRecords(input)

	return merged.policies.map((policy) => ({
		policyId: policy.id,
		policyNumber: policy.policyNumber,
		policyType: policy.policyType,
		productName: policy.productName,
		insurerId: policy.insurerId,
		status: policy.status,
		sumInsured: policy.sumInsured,
		currency: policy.currency,
		inceptionDate: policy.inceptionDate,
		expiryDate: policy.expiryDate,
		renewalDate: policy.renewalDate,
		premiums: merged.premiums.filter((item) => item.policyId === policy.id),
		renewals: merged.renewals.filter((item) => item.policyId === policy.id),
		claims: merged.claims.filter((item) => item.policyId === policy.id),
		coverages: merged.coverages.filter((item) => item.policyId === policy.id),
		members: merged.members.filter((item) => item.policyId === policy.id),
		nominees: merged.nominees.filter((item) => item.policyId === policy.id),
		sourceDocumentIds: policy.sourceDocumentIds,
		confidence: policy.confidence,
	}))
}

function buildCategorySnapshots(
	histories: PolicyHistory[],
): CategorySnapshot[] {
	const categories = getPolicyCategories()

	return categories.map((category) => {
		const categoryPolicies = histories.filter(
			(history) =>
				mapPolicyTypeToCategoryId(history.policyType) === category.id,
		)
		const activePolicies = categoryPolicies.filter(
			(history) => history.status === 'active',
		)
		const totalSumInsured = activePolicies.reduce<number | null>(
			(sum, history) => {
				if (history.sumInsured == null) {
					return sum
				}

				return (sum ?? 0) + history.sumInsured
			},
			null,
		)
		const latestRenewal = [...categoryPolicies].sort((a, b) => {
			const aDate = a.renewalDate ?? a.expiryDate ?? ''
			const bDate = b.renewalDate ?? b.expiryDate ?? ''

			return new Date(bDate).getTime() - new Date(aDate).getTime()
		})[0]
		const meta = getCategoryMeta(category.id)

		return {
			categoryId: category.id,
			name: meta.name,
			emoji: meta.emoji,
			color: meta.color,
			policyCount: categoryPolicies.length,
			activePolicyCount: activePolicies.length,
			totalSumInsured,
			currency: activePolicies[0]?.currency ?? 'INR',
			latestRenewalDate:
				latestRenewal?.renewalDate ?? latestRenewal?.expiryDate ?? null,
			statusLabel: summarizeCategoryStatus(
				categoryPolicies.map((history) => ({
					id: history.policyId,
					status: history.status,
					expiryDate: history.expiryDate,
					renewalDate: history.renewalDate,
				})) as InsurancePolicyRecord[],
			),
			lastUpdated: formatDisplayDate(
				latestRenewal?.renewalDate ??
					latestRenewal?.expiryDate ??
					latestRenewal?.inceptionDate,
			),
		}
	})
}

function buildAlerts(histories: PolicyHistory[]): InsuranceAlert[] {
	const alerts: InsuranceAlert[] = []

	for (const history of histories) {
		if (history.status === 'expired' || history.status === 'lapsed') {
			alerts.push({
				id: `alert-status-${history.policyId}`,
				policyId: history.policyId,
				severity: 'critical',
				message: `Policy ${history.policyNumber} is ${history.status}.`,
				observedAt:
					history.expiryDate ?? history.renewalDate ?? new Date().toISOString(),
			})
		}

		const days = daysUntil(history.expiryDate ?? history.renewalDate)

		if (
			history.status === 'active' &&
			days != null &&
			days >= 0 &&
			days <= EXPIRING_SOON_DAYS
		) {
			alerts.push({
				id: `alert-expiring-${history.policyId}`,
				policyId: history.policyId,
				severity: 'attention',
				message: `Policy ${history.policyNumber} renews in ${days} day${days === 1 ? '' : 's'}.`,
				observedAt: history.renewalDate ?? history.expiryDate ?? '',
			})
		}

		const openClaims = history.claims.filter(
			(claim) =>
				claim.status === 'filed' ||
				claim.status === 'processing' ||
				claim.status === 'approved',
		)

		for (const claim of openClaims) {
			alerts.push({
				id: `alert-claim-${claim.id}`,
				policyId: history.policyId,
				severity: 'attention',
				message: `Claim ${claim.claimNumber} is ${claim.status}.`,
				observedAt: claim.filedDate ?? new Date().toISOString(),
			})
		}
	}

	return alerts
}

function countActiveCategories(histories: PolicyHistory[]): number {
	const active = new Set<PolicyCategoryId>()

	for (const history of histories) {
		if (history.status === 'active') {
			active.add(mapPolicyTypeToCategoryId(history.policyType))
		}
	}

	return active.size
}

export function buildInsuranceKnowledgeGraph(
	input: BuildInsuranceKnowledgeInput,
): InsuranceKnowledgeGraph {
	const merged = mergeInsuranceRecords(input)
	const policyHistories = buildPolicyHistories({
		...input,
		...merged,
	})
	const categories = buildCategorySnapshots(policyHistories)
	const coverageGaps = detectCoverageGaps({
		categories,
		policyHistories,
	})
	const documentIds = [
		...new Set(
			merged.documents
				.filter((document) => document.status === 'completed')
				.map((document) => document.id),
		),
	]
	const policyIds = policyHistories.map((history) => history.policyId)

	const profile: PersonInsuranceProfile = {
		personId: input.personId,
		policyHistories,
		categories,
		insights: buildDerivedInsights({
			policyHistories,
			activeCategoryCount: countActiveCategories(policyHistories),
		}),
		alerts: buildAlerts(policyHistories),
		coverageGaps,
		relationships: buildPolicyRelationships({
			policies: merged.policies,
			coverages: merged.coverages,
			members: merged.members,
			nominees: merged.nominees,
			claims: merged.claims,
			documents: merged.documents,
			benefits: merged.benefits,
			exclusions: merged.exclusions,
			insurers: input.insurers,
		}),
		documentIds,
		policyIds,
		generatedAt: new Date().toISOString(),
		cacheVersion: CACHE_VERSION,
	}

	return {
		profile,
		policyCategories: getPolicyCategories(),
		insurers: input.insurers,
	}
}

export const insuranceKnowledgeGraphBuilder: KnowledgeGraphBuilder<
	BuildInsuranceKnowledgeInput,
	InsuranceKnowledgeGraph
> = {
	domain: 'insurance',
	build: buildInsuranceKnowledgeGraph,
}

export function buildInsuranceKnowledgeSourceKey(
	input: BuildInsuranceKnowledgeInput,
): string {
	const policyKey = input.policies
		.map(
			(policy) =>
				`${policy.id}:${policy.status}:${policy.updatedAt}:${policy.confidence}`,
		)
		.join('|')
	const documentKey = input.documents
		.map(
			(document) =>
				`${document.id}:${document.status}:${document.processedAt ?? document.uploadedAt}`,
		)
		.join('|')

	return `${policyKey}::${documentKey}`
}

export function isPolicyDisplayReady(policy: InsurancePolicyRecord): boolean {
	const hasRealInsurer =
		policy.insurerId.trim().length > 0 && policy.insurerId !== 'unknown-insurer'
	const hasPolicyNumber = policy.policyNumber.trim().length > 0
	const hasMeaningfulCoverage =
		(policy.sumInsured != null && policy.sumInsured > 0) ||
		Boolean(policy.expiryDate)
	const hasAiExtraction =
		policy.extractionMethod === 'llm' ||
		policy.extractionMethod === 'layout+llm'

	return (
		hasPolicyNumber &&
		hasRealInsurer &&
		hasMeaningfulCoverage &&
		(hasAiExtraction || policy.confidence >= 0.65)
	)
}

export function isPolicyExpiringSoon(
	policy: Pick<InsurancePolicyRecord, 'status' | 'expiryDate' | 'renewalDate'>,
): boolean {
	return isExpiringSoon(policy as InsurancePolicyRecord)
}

export function isPolicyActive(status: InsurancePolicyStatus): boolean {
	return status === 'active'
}
