import { buildFinanceKnowledge } from '@/features/finance-knowledge/services/finance-knowledge.builder'
import { planAndResolveFinanceEvidence } from '@/shared/ai/evidence-planning/plan-finance-evidence'
import type { FinanceKnowledge } from '@/features/finance-knowledge/types/finance-knowledge.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

export type FinanceDuplicateClassification =
	'SAFE_DUPLICATE' | 'POSSIBLE_DUPLICATE' | 'DISTINCT_ENTITY'

export interface FinanceDuplicateFinding {
	classification: FinanceDuplicateClassification
	reason: string
	entityIds: string[]
	documentIds: string[]
}

export interface FinanceIntegrityAuditResult {
	generatedAt: string
	summary: {
		documentsDiscovered: number
		documentsImported: number
		documentsClassified: number
		documentsRequiringReview: number
		documentsWithExtraction: number
		documentsWithCanonicalFacts: number
		entitiesCreated: number
		entitiesUnresolved: number
		entitiesAmbiguous: number
		observationsCreated: number
		duplicateObservations: number
		conflictingObservations: number
		entitiesWithoutCurrentValues: number
		timelineEvents: number
		snapshotKnownAssets: number
		snapshotKnownLiabilities: number
		snapshotShowsNetWorth: boolean
		coverageLimitations: number
	}
	findings: {
		duplicates: FinanceDuplicateFinding[]
		entitiesWithoutProvenance: string[]
		snapshotBlockers: string[]
		privacyWarnings: string[]
	}
	provenance: Array<{
		entityId: string
		displayName: string
		uiValue: string | null
		snapshotContribution: boolean
		currentFactValue: string | null
		observationCount: number
		sourceDocumentIds: string[]
	}>
	askSamples: Array<{
		question: string
		questionType: string
		evidenceLines: number
		limitations: number
	}>
	liveValidation: 'pending' | 'completed'
}

function entityCount(knowledge: FinanceKnowledge): number {
	return (
		knowledge.bankAccounts.length +
		knowledge.creditCards.length +
		knowledge.loans.length +
		knowledge.investmentAccounts.length
	)
}

function classifyDuplicateCandidates(
	knowledge: FinanceKnowledge,
): FinanceDuplicateFinding[] {
	const findings: FinanceDuplicateFinding[] = []
	const entities = [
		...knowledge.bankAccounts,
		...knowledge.creditCards,
		...knowledge.loans,
		...knowledge.investmentAccounts,
	]

	const byKey = new Map<string, typeof entities>()

	for (const entity of entities) {
		const key = [
			entity.kind,
			(entity.institutionName ?? '').toLowerCase(),
			entity.maskedIdentifier ?? '',
		].join(':')
		const bucket = byKey.get(key) ?? []
		bucket.push(entity)
		byKey.set(key, bucket)
	}

	for (const [key, bucket] of byKey.entries()) {
		if (bucket.length <= 1) {
			continue
		}

		const [, institution, identifier] = key.split(':')
		findings.push({
			classification: identifier ? 'POSSIBLE_DUPLICATE' : 'DISTINCT_ENTITY',
			reason: identifier
				? `Multiple ${bucket[0]?.kind} entities share institution ${institution || 'unknown'} and identifier ${identifier}`
				: `Multiple ${bucket[0]?.kind} entities share institution without stable identifier`,
			entityIds: bucket.map((entity) => entity.id),
			documentIds: bucket.flatMap((entity) => entity.sourceDocumentIds),
		})
	}

	const observationKeys = new Map<string, number>()
	for (const observation of knowledge.historicalFacts) {
		const key = `${observation.entityId}:${observation.factType}:${observation.asOfDate}:${observation.value}`
		observationKeys.set(key, (observationKeys.get(key) ?? 0) + 1)
	}

	for (const [key, count] of observationKeys.entries()) {
		if (count > 1) {
			findings.push({
				classification: 'SAFE_DUPLICATE',
				reason: `Duplicate observation key ${key}`,
				entityIds: [key.split(':')[0] ?? 'unknown'],
				documentIds: [],
			})
		}
	}

	return findings
}

function buildProvenanceAudit(knowledge: FinanceKnowledge) {
	const entities = [
		...knowledge.bankAccounts.map((entity) => ({
			entity,
			kind: 'bank_account',
		})),
		...knowledge.creditCards.map((entity) => ({ entity, kind: 'credit_card' })),
		...knowledge.loans.map((entity) => ({ entity, kind: 'loan' })),
		...knowledge.investmentAccounts.map((entity) => ({
			entity,
			kind: 'investment_account',
		})),
	]

	return entities.map(({ entity }) => {
		const current = entity.currentFacts.find(
			(fact) => fact.value && !fact.hasConflict,
		)
		const contribution = [
			...knowledge.snapshot.assetContributions,
			...knowledge.snapshot.liabilityContributions,
		].find((entry) => entry.entityId === entity.id)

		return {
			entityId: entity.id,
			displayName: entity.displayName,
			uiValue: current?.value ?? null,
			snapshotContribution: Boolean(contribution),
			currentFactValue: current?.value ?? null,
			observationCount: entity.historicalObservations.length,
			sourceDocumentIds: entity.sourceDocumentIds,
		}
	})
}

function buildSnapshotBlockers(knowledge: FinanceKnowledge): string[] {
	const blockers: string[] = []

	if (
		knowledge.snapshot.assetsTotal != null &&
		knowledge.loans.length + knowledge.creditCards.length > 0 &&
		knowledge.snapshot.liabilitiesTotal == null
	) {
		blockers.push(
			'Known assets exist while liability entities lack valued totals — net worth must not imply completeness.',
		)
	}

	if (
		knowledge.snapshot.showNetWorth &&
		knowledge.snapshot.coverage.unknownLiabilities > 0
	) {
		blockers.push('Net worth shown while unknown liabilities remain.')
	}

	if (knowledge.coverage.conflictingObservationCount > 0) {
		blockers.push('Conflicting observations detected.')
	}

	return blockers
}

export function runFinanceIntegrityAudit(input: {
	documents: ChronicleDocument[]
	knowledge?: FinanceKnowledge
	userId?: string
	hasFolderAssigned?: boolean
}): FinanceIntegrityAuditResult {
	const knowledge =
		input.knowledge ??
		buildFinanceKnowledge({
			userId: input.userId ?? 'audit-user',
			documents: input.documents.filter(
				(document) => document.category_id === 'financial',
			),
			members: [],
			hasFolderAssigned: input.hasFolderAssigned ?? false,
		})

	const financialDocuments = input.documents.filter(
		(document) => document.category_id === 'financial',
	)
	const classifiedDocuments = financialDocuments.filter(
		(document) =>
			document.sub_category_id && document.sub_category_id !== 'other',
	)
	const extractedDocuments = knowledge.documents.filter(
		(document) => document.extractionStatus === 'complete',
	)
	const reviewDocuments = knowledge.documents.filter(
		(document) =>
			document.consumerStatus === 'organizing' ||
			document.extractionStatus === 'incomplete' ||
			document.extractionStatus === 'failed' ||
			document.classificationConfidence === 'low' ||
			document.subCategoryId === 'other',
	)

	const entities = [
		...knowledge.bankAccounts,
		...knowledge.creditCards,
		...knowledge.loans,
		...knowledge.investmentAccounts,
	]

	const duplicateObservations =
		knowledge.historicalFacts.length -
		new Set(
			knowledge.historicalFacts.map(
				(observation) =>
					`${observation.entityId}:${observation.factType}:${observation.asOfDate}:${observation.value}`,
			),
		).size

	const entitiesWithoutCurrentValues = entities.filter(
		(entity) =>
			!entity.currentFacts.some((fact) => fact.value && !fact.hasConflict),
	).length

	const provenance = buildProvenanceAudit(knowledge)
	const entitiesWithoutProvenance = provenance
		.filter(
			(entry) =>
				entry.uiValue &&
				!entry.snapshotContribution &&
				!entry.sourceDocumentIds.length,
		)
		.map((entry) => entry.displayName)

	const askQuestions = [
		'How is my financial position?',
		'What are my major liabilities?',
		'What is my HDFC balance?',
		'Do you have all my financial information?',
	]

	const askSamples = askQuestions.map((question) => {
		const resolved = planAndResolveFinanceEvidence({ question, knowledge })
		return {
			question,
			questionType: resolved.questionType,
			evidenceLines: resolved.evidenceBundle.summary.lines.length,
			limitations: resolved.evidenceBundle.summary.limitations.length,
		}
	})

	return {
		generatedAt: new Date().toISOString(),
		summary: {
			documentsDiscovered: financialDocuments.length,
			documentsImported: financialDocuments.length,
			documentsClassified: classifiedDocuments.length,
			documentsRequiringReview: reviewDocuments.length,
			documentsWithExtraction: extractedDocuments.length,
			documentsWithCanonicalFacts:
				knowledge.financialFacts.length > 0 ? extractedDocuments.length : 0,
			entitiesCreated: entityCount(knowledge),
			entitiesUnresolved: entities.filter(
				(entity) => entity.resolutionState === 'unresolved',
			).length,
			entitiesAmbiguous: entities.filter(
				(entity) => entity.resolutionState === 'ambiguous',
			).length,
			observationsCreated: knowledge.historicalFacts.length,
			duplicateObservations,
			conflictingObservations: knowledge.coverage.conflictingObservationCount,
			entitiesWithoutCurrentValues,
			timelineEvents: knowledge.timeline.length,
			snapshotKnownAssets: knowledge.snapshot.coverage.knownAssets,
			snapshotKnownLiabilities: knowledge.snapshot.coverage.knownLiabilities,
			snapshotShowsNetWorth: knowledge.snapshot.showNetWorth,
			coverageLimitations: knowledge.snapshot.coverage.limitations.length,
		},
		findings: {
			duplicates: classifyDuplicateCandidates(knowledge),
			entitiesWithoutProvenance,
			snapshotBlockers: buildSnapshotBlockers(knowledge),
			privacyWarnings: [],
		},
		provenance,
		askSamples,
		liveValidation: input.documents.length > 0 ? 'completed' : 'pending',
	}
}

export function formatFinanceIntegrityAuditReport(
	result: FinanceIntegrityAuditResult,
): string {
	const lines = [
		`Finance Integrity Audit · ${result.generatedAt}`,
		'',
		'Summary',
		`- Documents discovered: ${result.summary.documentsDiscovered}`,
		`- Documents requiring review: ${result.summary.documentsRequiringReview}`,
		`- Entities created: ${result.summary.entitiesCreated}`,
		`- Observations: ${result.summary.observationsCreated}`,
		`- Timeline events: ${result.summary.timelineEvents}`,
		`- Snapshot shows net worth: ${result.summary.snapshotShowsNetWorth ? 'yes' : 'no'}`,
		'',
	]

	if (result.findings.snapshotBlockers.length > 0) {
		lines.push(
			'Snapshot blockers',
			...result.findings.snapshotBlockers.map((item) => `- ${item}`),
			'',
		)
	}

	if (result.findings.duplicates.length > 0) {
		lines.push(
			'Duplicate findings',
			...result.findings.duplicates.map(
				(item) => `- [${item.classification}] ${item.reason}`,
			),
			'',
		)
	}

	return lines.join('\n')
}
