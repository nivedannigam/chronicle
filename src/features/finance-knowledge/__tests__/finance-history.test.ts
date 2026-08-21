import { describe, expect, it } from 'vitest'
import {
	buildFinanceExtractionPayloadFromAi,
	deriveFinanceRecordsFromDocuments,
} from '@/features/finance-knowledge/services/derive-finance-records-from-documents.service'
import {
	compareFinancialDates,
	markConflictingObservations,
	mergeObservationsWithoutDoubleCounting,
	observationFromFactRecord,
	selectCurrentFactsForEntity,
} from '@/features/finance-knowledge/services/finance-observation.service'
import {
	resolveFinanceEntityForDocument,
	shouldMergeFinanceEntityMetadata,
} from '@/features/finance-knowledge/services/finance-entity-resolution.service'
import { filterFinanceEntitiesForMember } from '@/features/finance-knowledge/services/finance-member-filter.service'
import {
	buildFinanceKnowledge,
	buildFinanceHomeViewModel,
} from '@/features/finance-knowledge/services/finance-knowledge.builder'
import type { FinanceDocumentExtractionPayload } from '@/features/finance-knowledge/types/finance-extraction.types'
import type { FinanceDocumentAiExtraction } from '@/shared/ai/types/domain-document-extraction.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

const BASE: FinanceDocumentAiExtraction = {
	documentType: 'bank-statement',
	institution: 'HDFC Bank',
	accountType: 'Savings Account',
	cardName: null,
	loanType: null,
	investmentType: null,
	maskedAccountIdentifier: 'XXXX9012',
	accountHolder: 'Nivedan',
	jointHolder: null,
	statementDate: '2026-01-31',
	statementPeriodStart: '2026-01-01',
	statementPeriodEnd: '2026-01-31',
	currency: 'INR',
	openingBalance: 100000,
	closingBalance: 110000,
	totalAmountDue: null,
	minimumAmountDue: null,
	paymentDueDate: null,
	creditLimit: null,
	availableCredit: null,
	outstandingPrincipal: null,
	originalLoanAmount: null,
	interestRate: null,
	emi: null,
	nextPaymentDate: null,
	loanStartDate: null,
	loanEndDate: null,
	folioNumber: null,
	schemeName: null,
	units: null,
	nav: null,
	marketValue: null,
	investedValue: null,
	confidence: 0.92,
	rawFields: {},
}

function makeDocument(input: {
	id: string
	subCategoryId: string
	extraction: FinanceDocumentExtractionPayload
	familyMemberId?: string | null
	uploadedAt?: string
}): ChronicleDocument {
	return {
		id: input.id,
		user_id: 'user-1',
		title: 'Finance · Statement',
		file_name: 'statement.pdf',
		category_id: 'financial',
		sub_category_id: input.subCategoryId,
		status: 'active',
		family_member_id: input.familyMemberId ?? null,
		uploaded_at: input.uploadedAt ?? '2026-01-15T00:00:00.000Z',
		extracted_metadata: { financeExtraction: input.extraction },
		extracted_text: null,
		knowledge_refs: [],
		mime_type: 'application/pdf',
	} as ChronicleDocument
}

function buildPayload(input: {
	documentId: string
	extraction: FinanceDocumentAiExtraction
}): FinanceDocumentExtractionPayload {
	return buildFinanceExtractionPayloadFromAi({
		documentId: input.documentId,
		documentType: input.extraction.documentType,
		extraction: input.extraction,
		extractionMethod: 'gemini_structured',
		fallbackLabel: 'Statement',
	})
}

describe('longitudinal bank account resolution', () => {
	it('keeps one entity across Jan/Feb/Mar HDFC savings statements', () => {
		const months = [
			{ id: 'jan', date: '2026-01-31', closingBalance: 110000 },
			{ id: 'feb', date: '2026-02-28', closingBalance: 120000 },
			{ id: 'mar', date: '2026-03-31', closingBalance: 145000 },
		]

		const documents = months.map((month) =>
			makeDocument({
				id: `doc-${month.id}`,
				subCategoryId: 'bank-statement',
				extraction: buildPayload({
					documentId: `doc-${month.id}`,
					extraction: {
						...BASE,
						statementDate: month.date,
						statementPeriodEnd: month.date,
						closingBalance: month.closingBalance,
					},
				}),
			}),
		)

		const derived = deriveFinanceRecordsFromDocuments(documents)

		expect(derived.bankAccounts).toHaveLength(1)
		expect(derived.bankAccounts[0]?.resolutionState).toBe('matched')
		expect(derived.bankAccounts[0]?.sourceDocumentIds).toHaveLength(3)
		expect(
			derived.historicalFacts.filter(
				(fact) => fact.factType === 'closing_balance',
			),
		).toHaveLength(3)
	})
})

describe('home loan and credit card history', () => {
	it('merges home loan statements across years into one loan entity', () => {
		const documents = ['2025', '2026'].map((year) =>
			makeDocument({
				id: `loan-${year}`,
				subCategoryId: 'loan-statement',
				extraction: buildPayload({
					documentId: `loan-${year}`,
					extraction: {
						...BASE,
						documentType: 'loan-statement',
						loanType: 'Home Loan',
						maskedAccountIdentifier: 'HLXXXX4321',
						outstandingPrincipal: year === '2025' ? 3500000 : 3250000,
						statementDate: `${year}-08-15`,
					},
				}),
			}),
		)

		const derived = deriveFinanceRecordsFromDocuments(documents)

		expect(derived.loans).toHaveLength(1)
		expect(
			derived.historicalFacts.filter(
				(fact) => fact.factType === 'outstanding_principal',
			),
		).toHaveLength(2)
	})

	it('merges credit card statements across months into one card entity', () => {
		const months = ['2026-07-31', '2026-08-31', '2026-09-30']
		const documents = months.map((date, index) =>
			makeDocument({
				id: `cc-${index}`,
				subCategoryId: 'credit-card-statement',
				extraction: buildPayload({
					documentId: `cc-${index}`,
					extraction: {
						...BASE,
						documentType: 'credit-card-statement',
						cardName: 'Infinia',
						maskedAccountIdentifier: 'XXXX5678',
						totalAmountDue: 10000 + index * 1000,
						statementDate: date,
					},
				}),
			}),
		)

		const derived = deriveFinanceRecordsFromDocuments(documents)

		expect(derived.creditCards).toHaveLength(1)
		expect(
			derived.historicalFacts.filter(
				(fact) => fact.factType === 'total_amount_due',
			),
		).toHaveLength(3)
	})
})

describe('entity merge safety', () => {
	it('keeps HDFC Savings and HDFC Salary as separate entities', () => {
		const savings = makeDocument({
			id: 'savings',
			subCategoryId: 'bank-statement',
			extraction: buildPayload({
				documentId: 'savings',
				extraction: {
					...BASE,
					accountType: 'Savings Account',
					maskedAccountIdentifier: 'XXXX9012',
				},
			}),
		})
		const salary = makeDocument({
			id: 'salary',
			subCategoryId: 'bank-statement',
			extraction: buildPayload({
				documentId: 'salary',
				extraction: {
					...BASE,
					accountType: 'Salary Account',
					maskedAccountIdentifier: 'XXXX3456',
				},
			}),
		})

		const derived = deriveFinanceRecordsFromDocuments([savings, salary])

		expect(derived.bankAccounts).toHaveLength(2)
		expect(
			shouldMergeFinanceEntityMetadata('Savings Account', 'Salary Account'),
		).toBe(false)
	})

	it('does not merge HDFC Credit Card and HDFC Infinia by institution alone', () => {
		const generic = resolveFinanceEntityForDocument({
			kind: 'credit_card',
			institutionName: 'HDFC Bank',
			maskedIdentifier: 'XXXX1111',
			metadataLabel: 'Credit Card',
			fallbackLabel: 'HDFC Credit Card',
			accountHolder: null,
			jointHolder: null,
			existing: [],
		})
		const infinia = resolveFinanceEntityForDocument({
			kind: 'credit_card',
			institutionName: 'HDFC Bank',
			maskedIdentifier: 'XXXX2222',
			metadataLabel: 'Infinia',
			fallbackLabel: 'HDFC Infinia',
			accountHolder: null,
			jointHolder: null,
			existing: [
				{
					entityId: generic.entityId,
					dedupeKey: generic.dedupeKey,
					kind: 'credit_card',
					institutionName: 'HDFC Bank',
					maskedIdentifier: 'XXXX1111',
					metadataLabel: 'Credit Card',
				},
			],
		})

		expect(infinia.resolutionState).toBe('new')
		expect(infinia.entityId).not.toBe(generic.entityId)
	})

	it('reuses the first candidate when multiple matches are ambiguous', () => {
		const existing = [
			{
				entityId: 'finance-bank-hdfc-savings-a',
				dedupeKey: 'bank_account:hdfc-bank:savings-account',
				kind: 'bank_account' as const,
				institutionName: 'HDFC Bank',
				maskedIdentifier: null,
				metadataLabel: 'Savings Account',
			},
			{
				entityId: 'finance-bank-hdfc-savings-b',
				dedupeKey: 'bank_account:hdfc-bank:savings-account',
				kind: 'bank_account' as const,
				institutionName: 'HDFC Bank',
				maskedIdentifier: null,
				metadataLabel: 'Savings Account',
			},
		]

		const resolution = resolveFinanceEntityForDocument({
			kind: 'bank_account',
			institutionName: 'HDFC Bank',
			maskedIdentifier: null,
			metadataLabel: 'Savings Account',
			fallbackLabel: 'HDFC Savings',
			accountHolder: null,
			jointHolder: null,
			existing,
		})

		expect(resolution.entityId).toBe('finance-bank-hdfc-savings-a')
		expect(resolution.resolutionState).toBe('ambiguous')
	})
})

describe('observation selection and conflicts', () => {
	it('selects latest observation by financial date, not upload date', () => {
		expect(compareFinancialDates('2026-01-31', '2026-03-31')).toBeGreaterThan(0)

		const jan = observationFromFactRecord({
			id: 'doc-jan:closing_balance:2026-01-31',
			entityId: 'entity-1',
			factType: 'closing_balance',
			value: 'INR 110,000',
			unit: null,
			currency: 'INR',
			asOfDate: '2026-01-31',
			sourceDocumentId: 'doc-jan',
			sourcePage: null,
			confidence: 'high',
			extractionMethod: 'gemini_structured',
			verified: true,
		})
		const mar = observationFromFactRecord({
			id: 'doc-mar:closing_balance:2026-03-31',
			entityId: 'entity-1',
			factType: 'closing_balance',
			value: 'INR 145,000',
			unit: null,
			currency: 'INR',
			asOfDate: '2026-03-31',
			sourceDocumentId: 'doc-mar',
			sourcePage: null,
			confidence: 'high',
			extractionMethod: 'gemini_structured',
			verified: true,
		})

		const current = selectCurrentFactsForEntity({
			entityId: 'entity-1',
			observations: markConflictingObservations([jan, mar]),
		})

		expect(current[0]?.value).toBe('INR 145,000')
		expect(current[0]?.previousValue).toBe('INR 110,000')
	})

	it('surfaces conflicting August balances without silent overwrite', () => {
		const first = observationFromFactRecord({
			id: 'doc-a:closing_balance:2026-08-31',
			entityId: 'entity-1',
			factType: 'closing_balance',
			value: 'INR 100,000',
			unit: null,
			currency: 'INR',
			asOfDate: '2026-08-31',
			sourceDocumentId: 'doc-a',
			sourcePage: null,
			confidence: 'high',
			extractionMethod: 'gemini_structured',
			verified: true,
		})
		const second = observationFromFactRecord({
			id: 'doc-b:closing_balance:2026-08-31',
			entityId: 'entity-1',
			factType: 'closing_balance',
			value: 'INR 102,000',
			unit: null,
			currency: 'INR',
			asOfDate: '2026-08-31',
			sourceDocumentId: 'doc-b',
			sourcePage: null,
			confidence: 'high',
			extractionMethod: 'gemini_structured',
			verified: true,
		})

		const observations = markConflictingObservations([first, second])
		const current = selectCurrentFactsForEntity({
			entityId: 'entity-1',
			observations,
		})

		expect(observations.every((entry) => entry.isConflicting)).toBe(true)
		expect(current[0]?.hasConflict).toBe(true)
		expect(current[0]?.value).toBeNull()
		expect(current[0]?.conflictingSourceDocumentIds).toEqual(['doc-a', 'doc-b'])
	})
})

describe('duplicate protection', () => {
	it('does not double-count duplicate downloads of the same observation', () => {
		const observation = observationFromFactRecord({
			id: 'doc-1:closing_balance:2026-08-31',
			entityId: 'entity-1',
			factType: 'closing_balance',
			value: 'INR 120,000',
			unit: null,
			currency: 'INR',
			asOfDate: '2026-08-31',
			sourceDocumentId: 'doc-1',
			sourcePage: null,
			confidence: 'high',
			extractionMethod: 'gemini_structured',
			verified: true,
		})
		const duplicate = observationFromFactRecord({
			id: 'doc-2:closing_balance:2026-08-31',
			entityId: 'entity-1',
			factType: 'closing_balance',
			value: 'INR 120,000',
			unit: null,
			currency: 'INR',
			asOfDate: '2026-08-31',
			sourceDocumentId: 'doc-2',
			sourcePage: null,
			confidence: 'high',
			extractionMethod: 'gemini_structured',
			verified: true,
		})

		const merged = mergeObservationsWithoutDoubleCounting(
			[],
			[observation, duplicate],
		)

		expect(merged).toHaveLength(1)
		expect(merged[0]?.sourceDocumentIds).toEqual(['doc-1', 'doc-2'])
	})
})

describe('family ownership and member filtering', () => {
	it('preserves joint ownership from extraction', () => {
		const payload = buildPayload({
			documentId: 'joint-doc',
			extraction: {
				...BASE,
				jointHolder: 'Spouse',
			},
		})

		expect(payload.ownership).toBe('joint')
	})

	it('filters visibility without changing canonical entity identity', () => {
		const jointDoc = makeDocument({
			id: 'joint-doc',
			subCategoryId: 'bank-statement',
			familyMemberId: 'member-a',
			extraction: buildPayload({
				documentId: 'joint-doc',
				extraction: {
					...BASE,
					jointHolder: 'Spouse',
				},
			}),
		})

		const canonical = deriveFinanceRecordsFromDocuments([jointDoc])
		const filtered = filterFinanceEntitiesForMember({
			derived: canonical,
			documents: [jointDoc],
			selectedMemberId: null,
		})

		expect(filtered.bankAccounts).toHaveLength(1)
		expect(filtered.bankAccounts[0]?.ownership).toBe('joint')
		expect(filtered.bankAccounts[0]?.id).toBe(canonical.bankAccounts[0]?.id)
	})
})

describe('Finance Home canonical knowledge', () => {
	it('excludes unassigned documents from member-specific views', () => {
		const memberDoc = makeDocument({
			id: 'member-doc',
			subCategoryId: 'bank-statement',
			familyMemberId: 'member-a',
			extraction: buildPayload({
				documentId: 'member-doc',
				extraction: BASE,
			}),
		})
		const unassignedDoc = makeDocument({
			id: 'shared-doc',
			subCategoryId: 'bank-statement',
			familyMemberId: null,
			extraction: buildPayload({
				documentId: 'shared-doc',
				extraction: {
					...BASE,
					maskedAccountIdentifier: 'XXXX2222',
					accountType: 'Salary Account',
				},
			}),
		})

		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents: [memberDoc, unassignedDoc],
			members: [],
			hasFolderAssigned: true,
			selectedMemberId: 'member-a',
		})

		expect(knowledge.documentCount).toBe(1)
		expect(knowledge.bankAccounts).toHaveLength(1)
	})

	it('shows entity summaries without inventing totals', () => {
		const document = makeDocument({
			id: 'doc-hdfc',
			subCategoryId: 'bank-statement',
			extraction: buildPayload({
				documentId: 'doc-hdfc',
				extraction: BASE,
			}),
		})

		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents: [document],
			members: [],
			hasFolderAssigned: true,
		})
		const home = buildFinanceHomeViewModel({ knowledge })

		expect(knowledge.summary.netWorthKnown).toBe(110000)
		expect(home.snapshot.netWorthDisplay).toBe('₹1,10,000')
		expect(home.entitySummaries).toHaveLength(1)
		expect(home.entitySummaries[0]?.institutionName).toBe('HDFC Bank')
		expect(home.entitySummaries[0]?.maskedIdentifier).toBe('•••• 9012')
	})
})
