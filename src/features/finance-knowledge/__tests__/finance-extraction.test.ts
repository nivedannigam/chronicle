import { describe, expect, it } from 'vitest'
import { financeModuleProvider } from '@/core/platform/providers/finance-module.provider'
import {
	buildFinanceExtractionPayloadFromAi,
	deriveFinanceRecordsFromDocuments,
} from '@/features/finance-knowledge/services/derive-finance-records-from-documents.service'
import {
	buildFactsFromFinanceExtraction,
	mergeFactsWithoutDuplicates,
	validateFinanceAiExtraction,
} from '@/features/finance-knowledge/services/finance-extraction-validator.service'
import {
	buildFinanceEntityDedupeKey,
	shouldMergeFinanceEntities,
} from '@/features/finance-knowledge/services/finance-entity-resolver.service'
import {
	buildFinanceKnowledge,
	buildFinanceHomeViewModel,
} from '@/features/finance-knowledge/services/finance-knowledge.builder'
import type { FinanceDocumentExtractionPayload } from '@/features/finance-knowledge/types/finance-extraction.types'
import type { FinanceDocumentAiExtraction } from '@/shared/ai/types/domain-document-extraction.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

const BASE_EXTRACTION: FinanceDocumentAiExtraction = {
	documentType: 'bank-statement',
	institution: null,
	accountType: null,
	cardName: null,
	loanType: null,
	investmentType: null,
	maskedAccountIdentifier: null,
	accountHolder: null,
	jointHolder: null,
	statementDate: null,
	statementPeriodStart: null,
	statementPeriodEnd: null,
	currency: null,
	openingBalance: null,
	closingBalance: null,
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
	confidence: 0.9,
	rawFields: {},
}

const FIXTURES = {
	hdfcBank: {
		...BASE_EXTRACTION,
		documentType: 'bank-statement' as const,
		institution: 'HDFC Bank',
		accountType: 'Savings Account',
		maskedAccountIdentifier: 'XXXX9012',
		statementDate: '2026-08-31',
		statementPeriodStart: '2026-08-01',
		statementPeriodEnd: '2026-08-31',
		currency: 'INR',
		openingBalance: 100000,
		closingBalance: 120000,
		confidence: 0.92,
	},
	iciciCreditCard: {
		...BASE_EXTRACTION,
		documentType: 'credit-card-statement' as const,
		institution: 'ICICI Bank',
		cardName: 'Sapphiro',
		maskedAccountIdentifier: 'XXXX5678',
		statementDate: '2026-08-25',
		statementPeriodStart: '2026-07-26',
		statementPeriodEnd: '2026-08-25',
		totalAmountDue: 45230,
		minimumAmountDue: 2260,
		paymentDueDate: '2026-09-10',
		creditLimit: 300000,
		availableCredit: 254770,
		currency: 'INR',
		confidence: 0.88,
	},
	homeLoan: {
		...BASE_EXTRACTION,
		documentType: 'loan-statement' as const,
		institution: 'HDFC Ltd',
		loanType: 'Home Loan',
		maskedAccountIdentifier: 'HLXXXX4321',
		statementDate: '2026-08-15',
		outstandingPrincipal: 3250000,
		originalLoanAmount: 4500000,
		interestRate: 8.5,
		emi: 38500,
		nextPaymentDate: '2026-09-05',
		currency: 'INR',
		confidence: 0.9,
	},
	mutualFund: {
		...BASE_EXTRACTION,
		documentType: 'investment-statement' as const,
		institution: 'Axis Mutual Fund',
		investmentType: 'Mutual Fund',
		schemeName: 'Axis Bluechip Fund',
		maskedAccountIdentifier: 'Folio XXXX7890',
		statementDate: '2026-08-20',
		units: 1234.56,
		nav: 52.45,
		marketValue: 64752,
		investedValue: 50000,
		currency: 'INR',
		confidence: 0.86,
	},
} as const

function makeDocument(input: {
	id: string
	subCategoryId: string
	extraction?: FinanceDocumentExtractionPayload
	fileName?: string
	folderPath?: string
}): ChronicleDocument {
	return {
		id: input.id,
		user_id: 'user-1',
		title: `Finance · ${input.fileName ?? 'statement.pdf'}`,
		file_name: input.fileName ?? 'statement.pdf',
		category_id: 'financial',
		sub_category_id: input.subCategoryId,
		status: 'active',
		family_member_id: null,
		uploaded_at: '2026-08-01T00:00:00.000Z',
		extracted_metadata: input.extraction
			? {
					financeExtraction: input.extraction,
					folderPath: input.folderPath ?? 'Finance',
				}
			: { folderPath: input.folderPath ?? 'Finance' },
		extracted_text: null,
		knowledge_refs: [],
		mime_type: 'application/pdf',
	} as ChronicleDocument
}

function buildCompletePayload(input: {
	documentId: string
	documentType: string
	extraction: FinanceDocumentAiExtraction
	fallbackLabel: string
}): FinanceDocumentExtractionPayload {
	return buildFinanceExtractionPayloadFromAi({
		documentId: input.documentId,
		documentType: input.documentType,
		extraction: input.extraction,
		extractionMethod: 'gemini_structured',
		fallbackLabel: input.fallbackLabel,
	})
}

describe('Finance extraction fixtures', () => {
	it('extracts bank statement facts from HDFC fixture', () => {
		const payload = buildCompletePayload({
			documentId: 'doc-hdfc-bank',
			documentType: 'bank-statement',
			extraction: FIXTURES.hdfcBank,
			fallbackLabel: 'HDFC Savings Account',
		})

		expect(payload.status).toBe('complete')
		expect(payload.entityKind).toBe('bank_account')
		expect(payload.institutionName).toBe('HDFC Bank')
		expect(
			payload.facts.some((fact) => fact.factType === 'closing_balance'),
		).toBe(true)
	})

	it('extracts credit card facts from ICICI fixture', () => {
		const payload = buildCompletePayload({
			documentId: 'doc-icici-cc',
			documentType: 'credit-card-statement',
			extraction: FIXTURES.iciciCreditCard,
			fallbackLabel: 'ICICI Sapphiro',
		})

		expect(payload.entityKind).toBe('credit_card')
		expect(
			payload.facts.some((fact) => fact.factType === 'total_amount_due'),
		).toBe(true)
		expect(payload.facts.some((fact) => fact.factType === 'credit_limit')).toBe(
			true,
		)
	})

	it('extracts loan facts from home loan fixture', () => {
		const payload = buildCompletePayload({
			documentId: 'doc-home-loan',
			documentType: 'loan-statement',
			extraction: FIXTURES.homeLoan,
			fallbackLabel: 'Home Loan',
		})

		expect(payload.entityKind).toBe('loan')
		expect(
			payload.facts.some((fact) => fact.factType === 'outstanding_principal'),
		).toBe(true)
	})

	it('extracts investment facts from mutual fund fixture', () => {
		const payload = buildCompletePayload({
			documentId: 'doc-axis-mf',
			documentType: 'investment-statement',
			extraction: FIXTURES.mutualFund,
			fallbackLabel: 'Axis Bluechip Fund',
		})

		expect(payload.entityKind).toBe('investment_account')
		expect(payload.facts.some((fact) => fact.factType === 'market_value')).toBe(
			true,
		)
	})
})

describe('Finance extraction validation', () => {
	it('allows missing optional fields', () => {
		const payload = buildCompletePayload({
			documentId: 'doc-sparse',
			documentType: 'bank-statement',
			extraction: {
				...FIXTURES.hdfcBank,
				openingBalance: null,
				closingBalance: null,
				statementPeriodStart: null,
				statementPeriodEnd: null,
			},
			fallbackLabel: 'HDFC Account',
		})

		expect(payload.facts.length).toBe(0)
		expect(payload.status).toBe('incomplete')
	})

	it('rejects invalid numeric values', () => {
		const normalized = validateFinanceAiExtraction({
			...FIXTURES.hdfcBank,
			closingBalance: Number.NaN,
			openingBalance: Number.POSITIVE_INFINITY,
		})

		expect(normalized.closingBalance).toBeNull()
		expect(normalized.openingBalance).toBeNull()
	})

	it('rejects invalid dates', () => {
		const normalized = validateFinanceAiExtraction({
			...FIXTURES.iciciCreditCard,
			statementDate: 'not-a-date',
			paymentDueDate: '2026-13-40',
		})

		expect(normalized.statementDate).toBeNull()
		expect(normalized.paymentDueDate).toBeNull()
	})

	it('preserves provenance on extracted facts', () => {
		const facts = buildFactsFromFinanceExtraction({
			documentId: 'doc-prov',
			entityId: 'finance-bank-hdfc-9012',
			extraction: FIXTURES.hdfcBank,
			extractionMethod: 'gemini_structured',
		})

		const closingBalance = facts.find(
			(fact) => fact.factType === 'closing_balance',
		)
		expect(closingBalance?.sourceDocumentId).toBe('doc-prov')
		expect(closingBalance?.extractionMethod).toBe('gemini_structured')
		expect(closingBalance?.asOfDate).toBe('2026-08-31')
	})

	it('does not treat low-confidence facts as verified', () => {
		const facts = buildFactsFromFinanceExtraction({
			documentId: 'doc-low',
			entityId: 'finance-bank-hdfc-9012',
			extraction: { ...FIXTURES.hdfcBank, confidence: 0.4 },
			extractionMethod: 'gemini_structured',
		})

		expect(facts.every((fact) => !fact.verified)).toBe(true)
	})
})

describe('Finance entity linking and deduplication', () => {
	it('links documents to entities via strong identifier match', () => {
		const july = buildCompletePayload({
			documentId: 'doc-july',
			documentType: 'bank-statement',
			extraction: FIXTURES.hdfcBank,
			fallbackLabel: 'HDFC Savings',
		})
		const august = buildCompletePayload({
			documentId: 'doc-august',
			documentType: 'bank-statement',
			extraction: {
				...FIXTURES.hdfcBank,
				statementDate: '2026-09-30',
				closingBalance: 145000,
			},
			fallbackLabel: 'HDFC Savings',
		})

		const derived = deriveFinanceRecordsFromDocuments([
			makeDocument({
				id: 'doc-july',
				subCategoryId: 'bank-statement',
				extraction: july,
			}),
			makeDocument({
				id: 'doc-august',
				subCategoryId: 'bank-statement',
				extraction: august,
			}),
		])

		expect(derived.bankAccounts).toHaveLength(1)
		expect(derived.bankAccounts[0]?.sourceDocumentIds).toEqual([
			'doc-july',
			'doc-august',
		])
	})

	it('deduplicates entities with strong institution + identifier match', () => {
		const left = buildFinanceEntityDedupeKey({
			kind: 'bank_account',
			institutionName: 'HDFC Bank',
			maskedIdentifier: 'XXXX9012',
		})
		const right = buildFinanceEntityDedupeKey({
			kind: 'bank_account',
			institutionName: 'HDFC Bank',
			maskedIdentifier: '****9012',
		})

		expect(shouldMergeFinanceEntities(left, right)).toBe(true)
	})

	it('does not merge ambiguous entities without identifier', () => {
		const left = buildFinanceEntityDedupeKey({
			kind: 'bank_account',
			institutionName: 'HDFC Bank',
			maskedIdentifier: null,
		})
		const right = buildFinanceEntityDedupeKey({
			kind: 'bank_account',
			institutionName: 'HDFC Bank',
			maskedIdentifier: null,
		})

		expect(shouldMergeFinanceEntities(left, right)).toBe(false)
	})
})

describe('Finance reprocessing and historical facts', () => {
	it('does not duplicate facts on reprocessing', () => {
		const initial = buildFactsFromFinanceExtraction({
			documentId: 'doc-reprocess',
			entityId: 'finance-bank-hdfc-9012',
			extraction: FIXTURES.hdfcBank,
			extractionMethod: 'gemini_structured',
		})

		const merged = mergeFactsWithoutDuplicates(initial, initial)
		expect(merged).toHaveLength(initial.length)
	})

	it('preserves historical observations across statements', () => {
		const julyPayload = buildCompletePayload({
			documentId: 'doc-july-bal',
			documentType: 'bank-statement',
			extraction: FIXTURES.hdfcBank,
			fallbackLabel: 'HDFC Savings',
		})
		const augustPayload = buildCompletePayload({
			documentId: 'doc-august-bal',
			documentType: 'bank-statement',
			extraction: {
				...FIXTURES.hdfcBank,
				statementDate: '2026-09-30',
				closingBalance: 145000,
			},
			fallbackLabel: 'HDFC Savings',
		})

		const derived = deriveFinanceRecordsFromDocuments([
			makeDocument({
				id: 'doc-july-bal',
				subCategoryId: 'bank-statement',
				extraction: julyPayload,
			}),
			makeDocument({
				id: 'doc-august-bal',
				subCategoryId: 'bank-statement',
				extraction: augustPayload,
			}),
		])

		const closingFacts = derived.financialFacts.filter(
			(fact) => fact.factType === 'closing_balance',
		)
		expect(closingFacts).toHaveLength(2)
	})
})

describe('Finance AI failure behavior', () => {
	it('keeps classified documents available when extraction fails', () => {
		const document = makeDocument({
			id: 'doc-failed',
			subCategoryId: 'bank-statement',
			extraction: {
				status: 'failed',
				documentType: 'bank-statement',
				entityKind: null,
				entityId: null,
				institutionName: null,
				maskedIdentifier: null,
				displayName: null,
				accountType: null,
				cardName: null,
				loanType: null,
				schemeName: null,
				statementDate: null,
				statementPeriodStart: null,
				statementPeriodEnd: null,
				facts: [],
				ownership: 'unknown',
				accountHolder: null,
				jointHolder: null,
				extractionMethod: null,
				extractedAt: '2026-08-01T00:00:00.000Z',
				userMessage:
					"We couldn't read the financial details from this document yet.",
			},
		})

		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents: [document],
			members: [],
			hasFolderAssigned: true,
		})

		expect(knowledge.documentCount).toBe(1)
		expect(knowledge.bankAccounts).toHaveLength(0)
		expect(knowledge.documents[0]?.extractionUserMessage).toContain(
			"couldn't read the financial details",
		)
	})
})

describe('Finance Home and Library impact', () => {
	it('does not invent totals on Finance Home', () => {
		const hdfcPayload = buildCompletePayload({
			documentId: 'doc-hdfc-home',
			documentType: 'bank-statement',
			extraction: FIXTURES.hdfcBank,
			fallbackLabel: 'HDFC Savings',
		})

		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents: [
				makeDocument({
					id: 'doc-hdfc-home',
					subCategoryId: 'bank-statement',
					extraction: hdfcPayload,
				}),
			],
			members: [],
			hasFolderAssigned: true,
		})

		const home = buildFinanceHomeViewModel({ knowledge })

		expect(knowledge.summary.netWorthKnown).toBe(120000)
		expect(home.snapshot.netWorthDisplay).toBe('₹1,20,000')
		expect(home.entityCounts.bankAccounts).toBe(1)
	})

	it('keeps Library document count unchanged after extraction', () => {
		const document = makeDocument({
			id: 'doc-library',
			subCategoryId: 'bank-statement',
			extraction: buildCompletePayload({
				documentId: 'doc-library',
				documentType: 'bank-statement',
				extraction: FIXTURES.hdfcBank,
				fallbackLabel: 'HDFC Savings',
			}),
		})

		const section = financeModuleProvider.getDocumentSection({
			userId: 'user-1',
			sources: { documents: { uploadedDocuments: [document] } },
		})

		expect(section?.totalCount).toBe(1)
	})
})
