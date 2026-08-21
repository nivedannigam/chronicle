import { describe, expect, it } from 'vitest'
import {
	buildFinanceExtractionPayloadFromAi,
	deriveFinanceRecordsFromDocuments,
} from '@/features/finance-knowledge/services/derive-finance-records-from-documents.service'
import {
	buildFinanceKnowledge,
	buildFinanceHomeViewModel,
} from '@/features/finance-knowledge/services/finance-knowledge.builder'
import {
	buildFinanceSnapshot,
	isExcludedLiabilityFactType,
} from '@/features/finance-knowledge/services/finance-snapshot.service'
import {
	parseMoneyValue,
	formatSnapshotMoney,
} from '@/features/finance-knowledge/utils/finance-money.util'
import type { FinanceCoverageMeta } from '@/features/finance-knowledge/types/finance-history.types'
import type {
	BankAccountRecord,
	CreditCardRecord,
	FinanceCurrentFact,
	FinanceEntityBase,
	HoldingRecord,
	InvestmentAccountRecord,
	LoanRecord,
} from '@/features/finance-knowledge/types/finance-knowledge.types'
import type { FinanceDocumentAiExtraction } from '@/shared/ai/types/domain-document-extraction.types'
import type { ChronicleDocument } from '@/features/documents/types/document.types'

const BASE_COVERAGE: FinanceCoverageMeta = {
	level: 'documented',
	entityCount: 0,
	documentCount: 0,
	extractedDocumentCount: 0,
	incompleteDocumentCount: 0,
	ambiguousEntityCount: 0,
	conflictingObservationCount: 0,
}

function makeCurrentFact(input: {
	entityId: string
	factType: string
	value: string
	asOfDate?: string
	previousValue?: string
	previousAsOfDate?: string
}): FinanceCurrentFact {
	return {
		entityId: input.entityId,
		factType: input.factType,
		value: input.value,
		asOfDate: input.asOfDate ?? '2026-08-31',
		previousValue: input.previousValue ?? null,
		previousAsOfDate: input.previousAsOfDate ?? null,
		changeFromPrevious: null,
		sourceDocumentId: 'doc-1',
		confidence: 'high',
		hasConflict: false,
		conflictingSourceDocumentIds: [],
	}
}

function makeEntityBase(input: {
	id: string
	displayName: string
	currentFacts: FinanceCurrentFact[]
	ownership?: FinanceEntityBase['ownership']
}): FinanceEntityBase {
	return {
		id: input.id,
		displayName: input.displayName,
		institutionName: 'Test Bank',
		maskedIdentifier: '•••• 1234',
		ownership: input.ownership ?? 'individual',
		ownerMemberIds: [],
		status: 'active',
		facts: [],
		currentFacts: input.currentFacts,
		historicalObservations: [],
		resolutionState: 'matched',
		latestStatementDate: '2026-08-31',
		conflictingFactTypes: [],
		sourceDocumentIds: ['doc-1'],
		lastUpdatedFromDocumentAt: '2026-08-01T00:00:00.000Z',
	}
}

function makeBank(
	id: string,
	closingBalance: number,
	asOfDate = '2026-08-31',
): BankAccountRecord {
	return {
		...makeEntityBase({
			id,
			displayName: `Bank ${id}`,
			currentFacts: [
				makeCurrentFact({
					entityId: id,
					factType: 'closing_balance',
					value: `INR ${closingBalance.toLocaleString('en-IN')}`,
					asOfDate,
				}),
			],
		}),
		kind: 'bank_account',
	}
}

function makeInvestment(
	id: string,
	marketValue: number,
): InvestmentAccountRecord {
	return {
		...makeEntityBase({
			id,
			displayName: `Investment ${id}`,
			currentFacts: [
				makeCurrentFact({
					entityId: id,
					factType: 'market_value',
					value: `INR ${marketValue.toLocaleString('en-IN')}`,
				}),
			],
		}),
		kind: 'investment_account',
	}
}

function makeLoan(
	id: string,
	outstanding: number | null,
	original?: number,
): LoanRecord {
	const facts: FinanceCurrentFact[] = []

	if (outstanding != null) {
		facts.push(
			makeCurrentFact({
				entityId: id,
				factType: 'outstanding_principal',
				value: `INR ${outstanding.toLocaleString('en-IN')}`,
			}),
		)
	}

	if (original != null) {
		facts.push(
			makeCurrentFact({
				entityId: id,
				factType: 'original_loan_amount',
				value: `INR ${original.toLocaleString('en-IN')}`,
			}),
		)
	}

	return {
		...makeEntityBase({
			id,
			displayName: `Loan ${id}`,
			currentFacts: facts,
		}),
		kind: 'loan',
	}
}

function makeCreditCard(
	id: string,
	input: {
		totalDue?: number
		creditLimit?: number
		minimumDue?: number
	},
): CreditCardRecord {
	const facts: FinanceCurrentFact[] = []

	if (input.totalDue != null) {
		facts.push(
			makeCurrentFact({
				entityId: id,
				factType: 'total_amount_due',
				value: `INR ${input.totalDue.toLocaleString('en-IN')}`,
			}),
		)
	}

	if (input.creditLimit != null) {
		facts.push(
			makeCurrentFact({
				entityId: id,
				factType: 'credit_limit',
				value: `INR ${input.creditLimit.toLocaleString('en-IN')}`,
			}),
		)
	}

	if (input.minimumDue != null) {
		facts.push(
			makeCurrentFact({
				entityId: id,
				factType: 'minimum_amount_due',
				value: `INR ${input.minimumDue.toLocaleString('en-IN')}`,
			}),
		)
	}

	return {
		...makeEntityBase({
			id,
			displayName: `Card ${id}`,
			currentFacts: facts,
		}),
		kind: 'credit_card',
	}
}

function makeHolding(input: {
	id: string
	accountId: string
	marketValue: number
}): HoldingRecord {
	return {
		...makeEntityBase({
			id: input.id,
			displayName: `Holding ${input.id}`,
			currentFacts: [
				makeCurrentFact({
					entityId: input.id,
					factType: 'market_value',
					value: `INR ${input.marketValue.toLocaleString('en-IN')}`,
				}),
			],
		}),
		kind: 'holding',
		investmentAccountId: input.accountId,
	}
}

describe('finance money parsing', () => {
	it('parses INR formatted values', () => {
		expect(parseMoneyValue('INR 5,00,000')).toEqual({
			amount: 500000,
			currency: 'INR',
		})
	})

	it('formats snapshot money without artificial precision', () => {
		expect(formatSnapshotMoney(1243821.37, 'INR')).toBe('₹12,43,821')
	})
})

describe('realistic net worth scenario', () => {
	it('calculates assets, liabilities, and net worth from canonical observations', () => {
		const snapshot = buildFinanceSnapshot({
			bankAccounts: [makeBank('bank-a', 500000), makeBank('bank-b', 200000)],
			investmentAccounts: [makeInvestment('mf', 1000000)],
			creditCards: [makeCreditCard('cc', { totalDue: 50000 })],
			loans: [makeLoan('home-loan', 6000000)],
			holdings: [],
			documents: [],
			coverage: BASE_COVERAGE,
		})

		expect(snapshot.assetsTotal).toBe(1700000)
		expect(snapshot.liabilitiesTotal).toBe(6050000)
		expect(snapshot.netWorth).toBe(-4350000)
		expect(snapshot.showNetWorth).toBe(true)
		expect(snapshot.confidence).toBe('high')
	})
})

describe('mandatory double-counting protection', () => {
	it('uses account total OR holdings, never both', () => {
		const account = makeInvestment('mf-account', 1000000)
		const holdings = [
			makeHolding({ id: 'h-a', accountId: 'mf-account', marketValue: 400000 }),
			makeHolding({ id: 'h-b', accountId: 'mf-account', marketValue: 600000 }),
		]

		const snapshot = buildFinanceSnapshot({
			bankAccounts: [makeBank('bank-a', 500000)],
			investmentAccounts: [account],
			creditCards: [],
			loans: [],
			holdings,
			documents: [],
			coverage: BASE_COVERAGE,
		})

		expect(snapshot.assetsTotal).toBe(1500000)
		expect(snapshot.assetContributions).toHaveLength(2)
	})
})

describe('liability safety rules', () => {
	it('does not treat original loan amount as outstanding liability', () => {
		const snapshot = buildFinanceSnapshot({
			bankAccounts: [],
			investmentAccounts: [],
			creditCards: [],
			loans: [makeLoan('loan', null, 6000000)],
			holdings: [],
			documents: [],
			coverage: BASE_COVERAGE,
		})

		expect(snapshot.liabilityContributions).toHaveLength(0)
		expect(snapshot.liabilitiesTotal).toBeNull()
		expect(snapshot.coverage.unknownLiabilities).toBe(1)
	})

	it('does not treat credit limit or minimum due as liability', () => {
		const snapshot = buildFinanceSnapshot({
			bankAccounts: [],
			investmentAccounts: [],
			creditCards: [
				makeCreditCard('cc', { creditLimit: 300000, minimumDue: 5000 }),
			],
			loans: [],
			holdings: [],
			documents: [],
			coverage: BASE_COVERAGE,
		})

		expect(snapshot.liabilityContributions).toHaveLength(0)
		expect(isExcludedLiabilityFactType('credit_limit')).toBe(true)
		expect(isExcludedLiabilityFactType('minimum_amount_due')).toBe(true)
	})
})

describe('observation freshness and duplicates', () => {
	it('uses latest closing balance observation for bank assets', () => {
		const bank: BankAccountRecord = {
			...makeBank('bank-a', 500000, '2026-08-31'),
			currentFacts: [
				makeCurrentFact({
					entityId: 'bank-a',
					factType: 'closing_balance',
					value: 'INR 350,000',
					asOfDate: '2026-07-31',
				}),
				makeCurrentFact({
					entityId: 'bank-a',
					factType: 'closing_balance',
					value: 'INR 500,000',
					asOfDate: '2026-08-31',
				}),
			],
		}

		const snapshot = buildFinanceSnapshot({
			bankAccounts: [bank],
			investmentAccounts: [],
			creditCards: [],
			loans: [],
			holdings: [],
			documents: [],
			coverage: BASE_COVERAGE,
		})

		expect(snapshot.assetsTotal).toBe(500000)
	})

	it('does not double-count duplicate document observations', () => {
		const extraction: FinanceDocumentAiExtraction = {
			documentType: 'bank-statement',
			institution: 'HDFC Bank',
			accountType: 'Savings Account',
			cardName: null,
			loanType: null,
			investmentType: null,
			maskedAccountIdentifier: 'XXXX9012',
			accountHolder: null,
			jointHolder: null,
			statementDate: '2026-08-31',
			statementPeriodStart: '2026-08-01',
			statementPeriodEnd: '2026-08-31',
			currency: 'INR',
			openingBalance: null,
			closingBalance: 500000,
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

		const payload = buildFinanceExtractionPayloadFromAi({
			documentId: 'doc-1',
			documentType: 'bank-statement',
			extraction,
			extractionMethod: 'gemini_structured',
			fallbackLabel: 'HDFC Savings',
		})

		const duplicatePayload = buildFinanceExtractionPayloadFromAi({
			documentId: 'doc-2',
			documentType: 'bank-statement',
			extraction,
			extractionMethod: 'gemini_structured',
			fallbackLabel: 'HDFC Savings',
		})

		const documents = [
			{
				id: 'doc-1',
				user_id: 'user-1',
				title: 'Finance · HDFC',
				file_name: 'statement.pdf',
				category_id: 'financial',
				sub_category_id: 'bank-statement',
				status: 'active',
				family_member_id: null,
				uploaded_at: '2026-08-01T00:00:00.000Z',
				extracted_metadata: { financeExtraction: payload },
				extracted_text: null,
				knowledge_refs: [],
				mime_type: 'application/pdf',
			},
			{
				id: 'doc-2',
				user_id: 'user-1',
				title: 'Finance · HDFC copy',
				file_name: 'statement-copy.pdf',
				category_id: 'financial',
				sub_category_id: 'bank-statement',
				status: 'active',
				family_member_id: null,
				uploaded_at: '2026-08-02T00:00:00.000Z',
				extracted_metadata: { financeExtraction: duplicatePayload },
				extracted_text: null,
				knowledge_refs: [],
				mime_type: 'application/pdf',
			},
		] as ChronicleDocument[]

		const derived = deriveFinanceRecordsFromDocuments(documents)
		const snapshot = buildFinanceSnapshot({
			bankAccounts: derived.bankAccounts,
			investmentAccounts: [],
			creditCards: [],
			loans: [],
			holdings: [],
			documents: [],
			coverage: BASE_COVERAGE,
		})

		expect(derived.bankAccounts).toHaveLength(1)
		expect(snapshot.assetsTotal).toBe(500000)
	})
})

describe('coverage and confidence', () => {
	it('marks partial coverage when unvalued entities exist', () => {
		const bankWithoutBalance: BankAccountRecord = {
			...makeEntityBase({
				id: 'bank-empty',
				displayName: 'Empty Bank',
				currentFacts: [],
			}),
			kind: 'bank_account',
		}

		const partial = buildFinanceSnapshot({
			bankAccounts: [makeBank('bank-a', 500000), bankWithoutBalance],
			investmentAccounts: [],
			creditCards: [],
			loans: [],
			holdings: [],
			documents: [],
			coverage: BASE_COVERAGE,
		})

		expect(partial.confidence).toBe('partial')
		expect(partial.coverage.unknownAssets).toBe(1)
	})

	it('does not show fake net worth when evidence is insufficient', () => {
		const snapshot = buildFinanceSnapshot({
			bankAccounts: [],
			investmentAccounts: [],
			creditCards: [],
			loans: [],
			holdings: [],
			documents: [],
			coverage: BASE_COVERAGE,
		})

		expect(snapshot.showNetWorth).toBe(false)
		expect(snapshot.netWorthDisplay).toBeNull()
		expect(snapshot.confidence).toBe('insufficient')
	})

	it('does not show net worth when assets are known but liability entities lack values', () => {
		const loanWithoutBalance: LoanRecord = {
			...makeEntityBase({
				id: 'loan-empty',
				displayName: 'Home Loan',
				currentFacts: [],
			}),
			kind: 'loan',
			loanType: 'Home Loan',
		}

		const snapshot = buildFinanceSnapshot({
			bankAccounts: [makeBank('bank-a', 500000)],
			investmentAccounts: [],
			creditCards: [],
			loans: [loanWithoutBalance],
			holdings: [],
			documents: [],
			coverage: BASE_COVERAGE,
		})

		expect(snapshot.assetsTotal).toBe(500000)
		expect(snapshot.liabilitiesTotal).toBeNull()
		expect(snapshot.showNetWorth).toBe(false)
		expect(snapshot.netWorth).toBeNull()
		expect(snapshot.assetsDisplay).toBe('₹5,00,000')
		expect(snapshot.liabilitiesDisplay).toBeNull()
	})

	it('handles multiple currencies safely without summing', () => {
		const usdBank: BankAccountRecord = {
			...makeEntityBase({
				id: 'usd-bank',
				displayName: 'USD Bank',
				currentFacts: [
					makeCurrentFact({
						entityId: 'usd-bank',
						factType: 'closing_balance',
						value: 'USD 10,000',
					}),
				],
			}),
			kind: 'bank_account',
		}

		const snapshot = buildFinanceSnapshot({
			bankAccounts: [makeBank('inr-bank', 500000), usdBank],
			investmentAccounts: [],
			creditCards: [],
			loans: [],
			holdings: [],
			documents: [],
			coverage: BASE_COVERAGE,
		})

		expect(snapshot.currencies.sort()).toEqual(['INR', 'USD'])
		expect(snapshot.showNetWorth).toBe(false)
		expect(snapshot.netWorth).toBeNull()
	})
})

describe('non-financial semantics', () => {
	it('does not count property or insurance documents as assets', () => {
		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents: [
				{
					id: 'property-doc',
					user_id: 'user-1',
					title: 'Finance · Property Agreement',
					file_name: 'property.pdf',
					category_id: 'financial',
					sub_category_id: 'other',
					status: 'active',
					family_member_id: null,
					uploaded_at: '2026-08-01T00:00:00.000Z',
					extracted_metadata: { folderPath: 'Finance/Property' },
					extracted_text: null,
					knowledge_refs: [],
					mime_type: 'application/pdf',
				} as ChronicleDocument,
			],
			members: [],
			hasFolderAssigned: true,
		})

		expect(knowledge.snapshot.assetsTotal).toBeNull()
		expect(knowledge.snapshot.showNetWorth).toBe(false)
	})
})

describe('joint ownership and provenance', () => {
	it('includes joint account value once in all-family snapshot data', () => {
		const jointBank: BankAccountRecord = {
			...makeBank('joint', 300000),
			ownership: 'joint',
		}

		const snapshot = buildFinanceSnapshot({
			bankAccounts: [jointBank],
			investmentAccounts: [],
			creditCards: [],
			loans: [],
			holdings: [],
			documents: [],
			coverage: BASE_COVERAGE,
		})

		expect(snapshot.assetContributions).toHaveLength(1)
		expect(snapshot.assetContributions[0]?.sourceDocumentId).toBe('doc-1')
	})
})

describe('Finance Home snapshot integration', () => {
	it('shows snapshot on home when net worth is trustworthy', () => {
		const knowledge = buildFinanceKnowledge({
			userId: 'user-1',
			documents: [],
			members: [],
			hasFolderAssigned: true,
		})

		const enriched = {
			...knowledge,
			bankAccounts: [makeBank('bank-a', 500000)],
			snapshot: buildFinanceSnapshot({
				bankAccounts: [makeBank('bank-a', 500000)],
				investmentAccounts: [],
				creditCards: [],
				loans: [],
				holdings: [],
				documents: [],
				coverage: BASE_COVERAGE,
			}),
		}

		const home = buildFinanceHomeViewModel({ knowledge: enriched })

		expect(home.snapshot.netWorthDisplay).toBe('₹5,00,000')
		expect(home.snapshot.assetsDisplay).toBe('₹5,00,000')
	})
})
