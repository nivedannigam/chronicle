import type {
	InsuranceKnowledgeLimitation,
	InsuranceKnowledgeLimitationCode,
	InsuranceKnowledgePolicy,
} from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceCoverageSnapshot } from '@/features/insurance-knowledge/types/insurance-knowledge.types'
import type { InsuranceDocumentRecord } from '@/features/insurance-knowledge/types/insurance-record.types'

function limitation(
	code: InsuranceKnowledgeLimitationCode,
	message: string,
	severity: InsuranceKnowledgeLimitation['severity'] = 'info',
): InsuranceKnowledgeLimitation {
	return { code, message, severity }
}

export function buildKnowledgeLimitations(input: {
	policies: InsuranceKnowledgePolicy[]
	coverage: InsuranceCoverageSnapshot
	documents: InsuranceDocumentRecord[]
	processingCount: number
}): InsuranceKnowledgeLimitation[] {
	const limitations: InsuranceKnowledgeLimitation[] = []
	const displayReadyPolicies = input.policies.filter(
		(policy) => policy.isDisplayReady,
	)

	if (displayReadyPolicies.length === 0) {
		limitations.push(
			limitation(
				'no_policies',
				'No display-ready insurance policies available.',
				input.policies.length > 0 ? 'warning' : 'info',
			),
		)
	}

	if (displayReadyPolicies.length === 1) {
		limitations.push(
			limitation(
				'single_policy',
				'Only one policy available — portfolio protection analysis is limited.',
			),
		)
	}

	const expiredPolicies = input.policies.filter(
		(policy) => policy.status === 'expired' || policy.status === 'lapsed',
	)

	if (expiredPolicies.length > 0) {
		limitations.push(
			limitation(
				'policy_expired',
				`${expiredPolicies.length} polic${expiredPolicies.length === 1 ? 'y is' : 'ies are'} expired or lapsed.`,
				'warning',
			),
		)
	}

	const expiringPolicies = input.policies.filter(
		(policy) => policy.isExpiringSoon,
	)

	if (expiringPolicies.length > 0) {
		limitations.push(
			limitation(
				'renewal_within_30d',
				`${expiringPolicies.length} polic${expiringPolicies.length === 1 ? 'y renews' : 'ies renew'} within 30 days.`,
				'warning',
			),
		)
	}

	const incompletePolicies = input.policies.filter(
		(policy) => policy.needsReprocess || policy.sumInsured == null,
	)

	if (incompletePolicies.length > 0) {
		limitations.push(
			limitation(
				'incomplete_coverage_table',
				`${incompletePolicies.length} polic${incompletePolicies.length === 1 ? 'y has' : 'ies have'} incomplete coverage extraction.`,
				'warning',
			),
		)
	}

	const lowConfidencePolicies = input.policies.filter(
		(policy) => policy.confidence > 0 && policy.confidence < 0.5,
	)

	if (lowConfidencePolicies.length > 0) {
		limitations.push(
			limitation(
				'low_extraction_confidence',
				'Extraction confidence is low for one or more policies.',
				'warning',
			),
		)
	}

	if (input.coverage.failedCount > 0) {
		limitations.push(
			limitation(
				'import_failures',
				`${input.coverage.failedCount} import failure${input.coverage.failedCount === 1 ? '' : 's'} — corpus is incomplete.`,
				'warning',
			),
		)
	}

	const partialDocuments = input.documents.filter(
		(document) =>
			document.status === 'parsed' || document.status === 'processing',
	)

	if (partialDocuments.length > 0) {
		limitations.push(
			limitation(
				'partial_extraction',
				`${partialDocuments.length} document${partialDocuments.length === 1 ? '' : 's'} still have partial extraction.`,
				'warning',
			),
		)
	}

	if (input.coverage.policiesNeedingReprocess.length > 0) {
		limitations.push(
			limitation(
				'reprocess_needed',
				`${input.coverage.policiesNeedingReprocess.length} polic${input.coverage.policiesNeedingReprocess.length === 1 ? 'y needs' : 'ies need'} reprocessing.`,
				'warning',
			),
		)
	}

	if (input.processingCount > 0) {
		limitations.push(
			limitation(
				'processing_in_progress',
				`${input.processingCount} document${input.processingCount === 1 ? '' : 's'} still processing.`,
			),
		)
	}

	if (
		input.coverage.corpusCompleteness === 'partial' &&
		input.coverage.discoveredCount > input.coverage.displayReadyCount
	) {
		limitations.push(
			limitation(
				'incomplete_corpus',
				`Only ${input.coverage.displayReadyCount} of ${input.coverage.discoveredCount} discovered files are fully usable.`,
				'warning',
			),
		)
	}

	return dedupeLimitations(limitations)
}

function dedupeLimitations(
	limitations: InsuranceKnowledgeLimitation[],
): InsuranceKnowledgeLimitation[] {
	const seen = new Set<InsuranceKnowledgeLimitationCode>()
	const result: InsuranceKnowledgeLimitation[] = []

	for (const item of limitations) {
		if (seen.has(item.code)) {
			continue
		}

		seen.add(item.code)
		result.push(item)
	}

	return result
}
