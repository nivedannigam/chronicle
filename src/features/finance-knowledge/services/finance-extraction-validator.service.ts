import { maskAccountIdentifier } from '@/features/finance-knowledge/services/finance-mask.service'
import type {
	FinanceDocumentAiExtraction,
	FinancialFactRecord,
} from '@/features/finance-knowledge/types/finance-extraction.types'
import type { FinanceFactConfidence } from '@/features/finance-knowledge/types/finance-knowledge.types'

function confidenceFromScore(score: number): FinanceFactConfidence {
	if (score >= 0.85) return 'high'
	if (score >= 0.65) return 'medium'
	return 'low'
}

function isValidDate(value: string | null): boolean {
	if (!value) return false
	return !Number.isNaN(Date.parse(value))
}

function isPlausibleInterestRate(value: number | null): boolean {
	if (value == null) return true
	return value >= 0 && value <= 100
}

function isPlausibleNumeric(value: number | null): boolean {
	if (value == null) return true
	return Number.isFinite(value)
}

export function validateFinanceAiExtraction(
	extraction: FinanceDocumentAiExtraction,
): FinanceDocumentAiExtraction {
	return {
		...extraction,
		statementDate: isValidDate(extraction.statementDate)
			? extraction.statementDate
			: null,
		statementPeriodStart: isValidDate(extraction.statementPeriodStart)
			? extraction.statementPeriodStart
			: null,
		statementPeriodEnd: isValidDate(extraction.statementPeriodEnd)
			? extraction.statementPeriodEnd
			: null,
		paymentDueDate: isValidDate(extraction.paymentDueDate)
			? extraction.paymentDueDate
			: null,
		nextPaymentDate: isValidDate(extraction.nextPaymentDate)
			? extraction.nextPaymentDate
			: null,
		loanStartDate: isValidDate(extraction.loanStartDate)
			? extraction.loanStartDate
			: null,
		loanEndDate: isValidDate(extraction.loanEndDate)
			? extraction.loanEndDate
			: null,
		openingBalance: isPlausibleNumeric(extraction.openingBalance)
			? extraction.openingBalance
			: null,
		closingBalance: isPlausibleNumeric(extraction.closingBalance)
			? extraction.closingBalance
			: null,
		totalAmountDue: isPlausibleNumeric(extraction.totalAmountDue)
			? extraction.totalAmountDue
			: null,
		minimumAmountDue: isPlausibleNumeric(extraction.minimumAmountDue)
			? extraction.minimumAmountDue
			: null,
		creditLimit: isPlausibleNumeric(extraction.creditLimit)
			? extraction.creditLimit
			: null,
		availableCredit: isPlausibleNumeric(extraction.availableCredit)
			? extraction.availableCredit
			: null,
		outstandingPrincipal: isPlausibleNumeric(extraction.outstandingPrincipal)
			? extraction.outstandingPrincipal
			: null,
		originalLoanAmount: isPlausibleNumeric(extraction.originalLoanAmount)
			? extraction.originalLoanAmount
			: null,
		interestRate: isPlausibleInterestRate(extraction.interestRate)
			? extraction.interestRate
			: null,
		emi: isPlausibleNumeric(extraction.emi) ? extraction.emi : null,
		units: isPlausibleNumeric(extraction.units) ? extraction.units : null,
		nav: isPlausibleNumeric(extraction.nav) ? extraction.nav : null,
		marketValue: isPlausibleNumeric(extraction.marketValue)
			? extraction.marketValue
			: null,
		investedValue: isPlausibleNumeric(extraction.investedValue)
			? extraction.investedValue
			: null,
		maskedAccountIdentifier: extraction.maskedAccountIdentifier
			? maskAccountIdentifier(extraction.maskedAccountIdentifier)
			: null,
	}
}

function buildFact(input: {
	entityId: string
	documentId: string
	factType: string
	value: string
	currency?: string | null
	asOfDate?: string | null
	confidence: FinanceFactConfidence
	extractionMethod: string
	sourcePage?: number | null
}): FinancialFactRecord {
	return {
		id: `${input.documentId}:${input.factType}:${input.asOfDate ?? 'na'}`,
		entityId: input.entityId,
		factType: input.factType,
		value: input.value,
		unit: null,
		currency: input.currency ?? null,
		asOfDate: input.asOfDate ?? null,
		sourceDocumentId: input.documentId,
		sourcePage: input.sourcePage ?? null,
		confidence: input.confidence,
		extractionMethod: input.extractionMethod,
		verified: input.confidence !== 'low',
	}
}

function formatMoney(
	value: number | null,
	currency: string | null,
): string | null {
	if (value == null) return null
	return `${currency ?? 'INR'} ${value.toLocaleString('en-IN')}`
}

export function buildFactsFromFinanceExtraction(input: {
	documentId: string
	entityId: string
	extraction: FinanceDocumentAiExtraction
	extractionMethod: string
}): FinancialFactRecord[] {
	const confidence = confidenceFromScore(input.extraction.confidence)
	const facts: FinancialFactRecord[] = []
	const currency = input.extraction.currency ?? 'INR'
	const asOfDate = input.extraction.statementDate

	const candidates: Array<{
		factType: string
		value: string | null
		asOfDate?: string | null
	}> = [
		{
			factType: 'opening_balance',
			value: formatMoney(input.extraction.openingBalance, currency),
			asOfDate: input.extraction.statementPeriodStart ?? asOfDate,
		},
		{
			factType: 'closing_balance',
			value: formatMoney(input.extraction.closingBalance, currency),
			asOfDate: input.extraction.statementPeriodEnd ?? asOfDate,
		},
		{
			factType: 'total_amount_due',
			value: formatMoney(input.extraction.totalAmountDue, currency),
			asOfDate,
		},
		{
			factType: 'minimum_amount_due',
			value: formatMoney(input.extraction.minimumAmountDue, currency),
			asOfDate,
		},
		{
			factType: 'credit_limit',
			value: formatMoney(input.extraction.creditLimit, currency),
			asOfDate,
		},
		{
			factType: 'available_credit',
			value: formatMoney(input.extraction.availableCredit, currency),
			asOfDate,
		},
		{
			factType: 'outstanding_principal',
			value: formatMoney(input.extraction.outstandingPrincipal, currency),
			asOfDate,
		},
		{
			factType: 'original_loan_amount',
			value: formatMoney(input.extraction.originalLoanAmount, currency),
			asOfDate: input.extraction.loanStartDate ?? asOfDate,
		},
		{
			factType: 'interest_rate',
			value:
				input.extraction.interestRate != null
					? `${input.extraction.interestRate}%`
					: null,
			asOfDate,
		},
		{
			factType: 'emi',
			value: formatMoney(input.extraction.emi, currency),
			asOfDate,
		},
		{
			factType: 'units',
			value:
				input.extraction.units != null ? String(input.extraction.units) : null,
			asOfDate,
		},
		{
			factType: 'nav',
			value: formatMoney(input.extraction.nav, currency),
			asOfDate,
		},
		{
			factType: 'market_value',
			value: formatMoney(input.extraction.marketValue, currency),
			asOfDate,
		},
		{
			factType: 'invested_value',
			value: formatMoney(input.extraction.investedValue, currency),
			asOfDate,
		},
		{
			factType: 'payment_due_date',
			value: input.extraction.paymentDueDate,
			asOfDate: input.extraction.paymentDueDate,
		},
		{
			factType: 'next_payment_date',
			value: input.extraction.nextPaymentDate,
			asOfDate: input.extraction.nextPaymentDate,
		},
	]

	for (const candidate of candidates) {
		if (!candidate.value) continue

		facts.push(
			buildFact({
				entityId: input.entityId,
				documentId: input.documentId,
				factType: candidate.factType,
				value: candidate.value,
				currency,
				asOfDate: candidate.asOfDate ?? asOfDate,
				confidence,
				extractionMethod: input.extractionMethod,
			}),
		)
	}

	return facts
}

export function mergeFactsWithoutDuplicates(
	existing: FinancialFactRecord[],
	incoming: FinancialFactRecord[],
): FinancialFactRecord[] {
	const map = new Map(existing.map((fact) => [fact.id, fact]))

	for (const fact of incoming) {
		map.set(fact.id, fact)
	}

	return [...map.values()]
}
