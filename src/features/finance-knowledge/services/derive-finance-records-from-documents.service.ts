import type { ChronicleDocument } from '@/features/documents/types/document.types'
import {
	buildFinanceEntityDisplayName,
	resolveFinanceEntityKind,
} from '@/features/finance-knowledge/services/finance-entity-resolver.service'
import {
	buildFinanceEntityMetadataLabel,
	resolveFinanceEntityForDocument,
} from '@/features/finance-knowledge/services/finance-entity-resolution.service'
import { mergeEntityOwnership } from '@/features/finance-knowledge/services/finance-member-filter.service'
import {
	buildObservationsFromFacts,
	compareFinancialDates,
	markConflictingObservations,
	mergeObservationsWithoutDoubleCounting,
	selectCurrentFactsForEntity,
} from '@/features/finance-knowledge/services/finance-observation.service'
import type {
	FinanceDocumentExtractionPayload,
	FinanceExtractableDocumentType,
	FinancialFactRecord,
} from '@/features/finance-knowledge/types/finance-extraction.types'
import type {
	FinanceCurrentFact,
	FinanceEntityMatchCandidate,
	FinanceEntityResolutionState,
	FinanceObservation,
} from '@/features/finance-knowledge/types/finance-history.types'
import type {
	BankAccountRecord,
	CreditCardRecord,
	FinanceFact,
	FinanceOwnership,
	InvestmentAccountRecord,
	LoanRecord,
} from '@/features/finance-knowledge/types/finance-knowledge.types'
import { FINANCE_EXTRACTABLE_TYPES } from '@/features/finance-knowledge/types/finance-extraction.types'
import {
	buildFactsFromFinanceExtraction,
	mergeFactsWithoutDuplicates,
	validateFinanceAiExtraction,
} from '@/features/finance-knowledge/services/finance-extraction-validator.service'
import type { FinanceDocumentAiExtraction } from '@/shared/ai/types/domain-document-extraction.types'

export interface DerivedFinanceRecords {
	bankAccounts: BankAccountRecord[]
	creditCards: CreditCardRecord[]
	loans: LoanRecord[]
	investmentAccounts: InvestmentAccountRecord[]
	financialFacts: FinancialFactRecord[]
	currentFacts: FinanceCurrentFact[]
	historicalFacts: FinanceObservation[]
}

interface PendingEntityDocument {
	document: ChronicleDocument
	payload: FinanceDocumentExtractionPayload
	kind: ReturnType<typeof resolveFinanceEntityKind>
	metadataLabel: string | null
}

function mergeResolutionState(
	current: FinanceEntityResolutionState | undefined,
	incoming: FinanceEntityResolutionState,
): FinanceEntityResolutionState {
	if (incoming === 'matched' || current === 'matched') {
		return incoming === 'ambiguous' ? (current ?? incoming) : 'matched'
	}

	if (incoming === 'new' || current === 'new') {
		return 'new'
	}

	return incoming ?? current ?? 'unresolved'
}

function readFinanceExtraction(
	document: ChronicleDocument,
): FinanceDocumentExtractionPayload | null {
	const payload = document.extracted_metadata?.financeExtraction
	if (!payload || typeof payload !== 'object') {
		return null
	}

	return payload as FinanceDocumentExtractionPayload
}

function isExtractableDocument(document: ChronicleDocument): boolean {
	const type = document.sub_category_id
	return (
		type != null &&
		FINANCE_EXTRACTABLE_TYPES.includes(
			type as (typeof FINANCE_EXTRACTABLE_TYPES)[number],
		)
	)
}

function toLegacyFacts(currentFacts: FinanceCurrentFact[]): FinanceFact[] {
	return currentFacts
		.filter((fact) => fact.value && !fact.hasConflict)
		.map((fact) => ({
			key: fact.factType,
			value: fact.value!,
			asOfDate: fact.asOfDate,
			sourceDocumentId: fact.sourceDocumentId ?? '',
			confidence: fact.confidence ?? 'medium',
		}))
}

function buildEntityRecord(input: {
	entityId: string
	kind: ReturnType<typeof resolveFinanceEntityKind>
	payload: FinanceDocumentExtractionPayload
	ownership: FinanceOwnership
	resolutionState: FinanceEntityResolutionState
	sourceDocumentIds: string[]
	ownerMemberIds: string[]
	observations: FinanceObservation[]
	currentFacts: FinanceCurrentFact[]
	latestStatementDate: string | null
}):
	BankAccountRecord | CreditCardRecord | LoanRecord | InvestmentAccountRecord {
	const base = {
		id: input.entityId,
		displayName:
			input.payload.displayName ??
			input.payload.institutionName ??
			'Financial account',
		institutionName: input.payload.institutionName,
		maskedIdentifier: input.payload.maskedIdentifier,
		ownership: input.ownership,
		ownerMemberIds: input.ownerMemberIds,
		status: 'active' as const,
		facts: toLegacyFacts(input.currentFacts),
		currentFacts: input.currentFacts,
		historicalObservations: input.observations,
		resolutionState: input.resolutionState,
		latestStatementDate: input.latestStatementDate,
		conflictingFactTypes: input.currentFacts
			.filter((fact) => fact.hasConflict)
			.map((fact) => fact.factType),
		sourceDocumentIds: input.sourceDocumentIds,
		lastUpdatedFromDocumentAt: input.payload.extractedAt,
	}

	switch (input.kind) {
		case 'credit_card':
			return { ...base, kind: 'credit_card' }
		case 'loan':
			return { ...base, kind: 'loan' }
		case 'investment_account':
			return { ...base, kind: 'investment_account' }
		default:
			return { ...base, kind: 'bank_account' }
	}
}

export function deriveFinanceRecordsFromDocuments(
	documents: ChronicleDocument[],
): DerivedFinanceRecords {
	const pendingDocuments: PendingEntityDocument[] = []
	const financialFacts: FinancialFactRecord[] = []

	for (const document of documents) {
		if (
			document.category_id !== 'financial' ||
			!isExtractableDocument(document)
		) {
			continue
		}

		const payload = readFinanceExtraction(document)
		if (!payload || payload.status !== 'complete') {
			continue
		}

		for (const fact of payload.facts) {
			if (!financialFacts.some((entry) => entry.id === fact.id)) {
				financialFacts.push(fact)
			}
		}

		const kind =
			payload.entityKind ??
			resolveFinanceEntityKind(
				payload.documentType as FinanceExtractableDocumentType,
			)
		pendingDocuments.push({
			document,
			payload,
			kind,
			metadataLabel: buildFinanceEntityMetadataLabel({
				kind,
				accountType: payload.accountType,
				cardName: payload.cardName,
				loanType: payload.loanType,
				schemeName: payload.schemeName,
			}),
		})
	}

	const entityCandidates: FinanceEntityMatchCandidate[] = []
	const entityDocuments = new Map<string, PendingEntityDocument[]>()
	const entityOwnership = new Map<string, FinanceOwnership>()
	const entityResolution = new Map<string, FinanceEntityResolutionState>()
	const entityDedupeKeys = new Map<string, string | null>()

	for (const pending of pendingDocuments) {
		const kind = pending.kind
		const metadataLabel = buildFinanceEntityMetadataLabel({
			kind,
			accountType: pending.payload.accountType,
			cardName: pending.payload.cardName,
			loanType: pending.payload.loanType,
			schemeName: pending.payload.schemeName,
		})

		const resolution = resolveFinanceEntityForDocument({
			kind,
			institutionName: pending.payload.institutionName,
			maskedIdentifier: pending.payload.maskedIdentifier,
			metadataLabel,
			fallbackLabel: pending.payload.displayName ?? pending.document.file_name,
			accountHolder: pending.payload.accountHolder,
			jointHolder: pending.payload.jointHolder,
			existing: entityCandidates,
		})

		const entityId = resolution.entityId
		const documentsForEntity = entityDocuments.get(entityId) ?? []
		documentsForEntity.push(pending)
		entityDocuments.set(entityId, documentsForEntity)

		entityOwnership.set(
			entityId,
			mergeEntityOwnership(
				entityOwnership.get(entityId) ?? 'unknown',
				pending.payload.ownership ?? resolution.ownership,
			),
		)

		entityResolution.set(
			entityId,
			mergeResolutionState(
				entityResolution.get(entityId),
				resolution.resolutionState,
			),
		)

		entityDedupeKeys.set(entityId, resolution.dedupeKey)

		if (
			!entityCandidates.some((candidate) => candidate.entityId === entityId)
		) {
			entityCandidates.push({
				entityId,
				dedupeKey: resolution.dedupeKey,
				kind,
				institutionName: pending.payload.institutionName,
				maskedIdentifier: pending.payload.maskedIdentifier,
				metadataLabel,
			})
		}
	}

	const entityMap = new Map<
		string,
		BankAccountRecord | CreditCardRecord | LoanRecord | InvestmentAccountRecord
	>()

	for (const [entityId, docsForEntity] of entityDocuments.entries()) {
		const verifiedFacts = docsForEntity.flatMap((entry) =>
			entry.payload.facts.filter((fact) => fact.verified),
		)
		const observations = markConflictingObservations(
			mergeObservationsWithoutDoubleCounting(
				[],
				buildObservationsFromFacts(verifiedFacts),
			),
		)
		const currentFacts = selectCurrentFactsForEntity({
			entityId,
			observations,
		})

		const latestStatementDate =
			docsForEntity
				.map((entry) => entry.payload.statementDate)
				.filter(Boolean)
				.sort(compareFinancialDates)[0] ?? null

		const ownerMemberIds = [
			...new Set(
				docsForEntity
					.map((entry) => entry.document.family_member_id)
					.filter((memberId): memberId is string => memberId != null),
			),
		]

		const first = docsForEntity[0]!
		const record = buildEntityRecord({
			entityId,
			kind: first.kind,
			payload: first.payload,
			ownership: entityOwnership.get(entityId) ?? 'unknown',
			resolutionState: entityResolution.get(entityId) ?? 'unresolved',
			sourceDocumentIds: docsForEntity.map((entry) => entry.document.id),
			ownerMemberIds,
			observations,
			currentFacts,
			latestStatementDate,
		})

		entityMap.set(entityId, record)
	}

	const bankAccounts: BankAccountRecord[] = []
	const creditCards: CreditCardRecord[] = []
	const loans: LoanRecord[] = []
	const investmentAccounts: InvestmentAccountRecord[] = []
	const currentFacts: FinanceCurrentFact[] = []
	const historicalFacts: FinanceObservation[] = []

	for (const record of entityMap.values()) {
		currentFacts.push(...record.currentFacts)
		historicalFacts.push(...record.historicalObservations)

		switch (record.kind) {
			case 'credit_card':
				creditCards.push(record)
				break
			case 'loan':
				loans.push(record)
				break
			case 'investment_account':
				investmentAccounts.push(record)
				break
			default:
				bankAccounts.push(record)
				break
		}
	}

	return {
		bankAccounts,
		creditCards,
		loans,
		investmentAccounts,
		financialFacts,
		currentFacts,
		historicalFacts,
	}
}

export function buildFinanceExtractionPayloadFromAi(input: {
	documentId: string
	documentType: string
	extraction: FinanceDocumentAiExtraction
	extractionMethod: string
	fallbackLabel: string
	existingFacts?: FinancialFactRecord[]
}): FinanceDocumentExtractionPayload {
	const normalized = validateFinanceAiExtraction(input.extraction)
	const entityKind = resolveFinanceEntityKind(normalized.documentType)
	const metadataLabel = buildFinanceEntityMetadataLabel({
		kind: entityKind,
		accountType: normalized.accountType,
		cardName: normalized.cardName,
		loanType: normalized.loanType,
		schemeName: normalized.schemeName,
	})
	const resolution = resolveFinanceEntityForDocument({
		kind: entityKind,
		institutionName: normalized.institution,
		maskedIdentifier: normalized.maskedAccountIdentifier,
		metadataLabel,
		fallbackLabel: input.fallbackLabel,
		accountHolder: normalized.accountHolder,
		jointHolder: normalized.jointHolder,
		existing: [],
	})
	const displayName = buildFinanceEntityDisplayName({
		kind: entityKind,
		institutionName: normalized.institution,
		accountType: normalized.accountType,
		cardName: normalized.cardName,
		loanType: normalized.loanType,
		schemeName: normalized.schemeName,
		fallbackLabel: input.fallbackLabel,
	})
	const facts = mergeFactsWithoutDuplicates(
		input.existingFacts ?? [],
		buildFactsFromFinanceExtraction({
			documentId: input.documentId,
			entityId: resolution.entityId,
			extraction: normalized,
			extractionMethod: input.extractionMethod,
		}),
	)

	const hasVerifiedFacts = facts.some((fact) => fact.verified)
	const ownership = normalized.jointHolder?.trim()
		? 'joint'
		: normalized.accountHolder?.trim()
			? 'individual'
			: 'unknown'

	return {
		status: hasVerifiedFacts ? 'complete' : 'incomplete',
		documentType:
			input.documentType as FinanceDocumentExtractionPayload['documentType'],
		entityKind,
		entityId: resolution.entityId,
		institutionName: normalized.institution,
		maskedIdentifier: normalized.maskedAccountIdentifier,
		displayName,
		accountType: normalized.accountType,
		cardName: normalized.cardName,
		loanType: normalized.loanType,
		schemeName: normalized.schemeName,
		statementDate: normalized.statementDate,
		statementPeriodStart: normalized.statementPeriodStart,
		statementPeriodEnd: normalized.statementPeriodEnd,
		facts,
		ownership,
		accountHolder: normalized.accountHolder,
		jointHolder: normalized.jointHolder,
		extractionMethod: input.extractionMethod,
		extractedAt: new Date().toISOString(),
		userMessage: hasVerifiedFacts
			? null
			: "We couldn't read the financial details from this document yet.",
	}
}
