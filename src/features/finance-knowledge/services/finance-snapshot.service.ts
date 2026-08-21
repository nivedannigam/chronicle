import type {
	FinanceCoverageMeta,
	FinanceCurrentFact,
} from '@/features/finance-knowledge/types/finance-history.types'
import type {
	FinanceSnapshot,
	FinanceSnapshotContribution,
	FinanceSnapshotCoverageDetail,
	FinanceSnapshotHistoryPreview,
	FinanceSnapshotHomeView,
	FinanceValuationLevel,
} from '@/features/finance-knowledge/types/finance-snapshot.types'
import type {
	BankAccountRecord,
	CreditCardRecord,
	FinanceDocumentRef,
	FinanceEntityBase,
	HoldingRecord,
	InvestmentAccountRecord,
	LoanRecord,
} from '@/features/finance-knowledge/types/finance-knowledge.types'
import {
	formatSnapshotMoney,
	parseMoneyValue,
	sumMoneyAmounts,
} from '@/features/finance-knowledge/utils/finance-money.util'
import { compareFinancialDates } from '@/features/finance-knowledge/services/finance-observation.service'

const ASSET_FACT_TYPES = {
	bank_account: ['closing_balance'],
	investment_account: ['market_value'],
	holding: ['market_value'],
} as const

const LIABILITY_FACT_TYPES = {
	loan: ['outstanding_principal'],
	credit_card: ['total_amount_due'],
} as const

const EXCLUDED_LIABILITY_FACT_TYPES = new Set([
	'credit_limit',
	'minimum_amount_due',
	'available_credit',
	'original_loan_amount',
	'emi',
	'interest_rate',
])

function getTrustworthyCurrentFact(
	entity: FinanceEntityBase,
	factTypes: readonly string[],
): FinanceCurrentFact | null {
	const candidates = entity.currentFacts.filter(
		(entry) =>
			factTypes.includes(entry.factType) &&
			entry.value &&
			!entry.hasConflict &&
			(entry.confidence === 'high' || entry.confidence === 'medium'),
	)

	if (candidates.length === 0) {
		return null
	}

	return (
		[...candidates].sort((left, right) =>
			compareFinancialDates(left.asOfDate, right.asOfDate),
		)[0] ?? null
	)
}

function buildContribution(input: {
	entity: FinanceEntityBase
	entityKind: string
	fact: FinanceCurrentFact
	valuationLevel: FinanceValuationLevel
}): FinanceSnapshotContribution | null {
	const parsed = parseMoneyValue(input.fact.value)
	if (!parsed) {
		return null
	}

	return {
		entityId: input.entity.id,
		entityKind: input.entityKind,
		displayName: input.entity.displayName,
		factType: input.fact.factType,
		amount: parsed.amount,
		currency: parsed.currency,
		asOfDate: input.fact.asOfDate,
		sourceDocumentId: input.fact.sourceDocumentId,
		valuationLevel: input.valuationLevel,
	}
}

function resolveInvestmentContributions(input: {
	accounts: InvestmentAccountRecord[]
	holdings: HoldingRecord[]
}): {
	contributions: FinanceSnapshotContribution[]
	unknownCount: number
} {
	const contributions: FinanceSnapshotContribution[] = []
	let unknownCount = 0

	for (const account of input.accounts) {
		const accountFact = getTrustworthyCurrentFact(
			account,
			ASSET_FACT_TYPES.investment_account,
		)

		if (accountFact) {
			const contribution = buildContribution({
				entity: account,
				entityKind: 'investment_account',
				fact: accountFact,
				valuationLevel: 'account_total',
			})

			if (contribution) {
				contributions.push(contribution)
				continue
			}
		}

		const childHoldings = input.holdings.filter(
			(holding) => holding.investmentAccountId === account.id,
		)

		if (childHoldings.length > 0) {
			let currency: string | null = null
			let hasValue = false

			for (const holding of childHoldings) {
				const holdingFact = getTrustworthyCurrentFact(
					holding,
					ASSET_FACT_TYPES.holding,
				)
				if (!holdingFact) continue

				const contribution = buildContribution({
					entity: holding,
					entityKind: 'holding',
					fact: holdingFact,
					valuationLevel: 'holding_value',
				})

				if (!contribution) continue

				if (currency && currency !== contribution.currency) {
					hasValue = false
					break
				}

				currency = contribution.currency
				contributions.push(contribution)
				hasValue = true
			}

			if (hasValue) {
				continue
			}
		}

		unknownCount += 1
	}

	return { contributions, unknownCount }
}

function buildAssetContributions(input: {
	bankAccounts: BankAccountRecord[]
	investmentAccounts: InvestmentAccountRecord[]
	holdings: HoldingRecord[]
}): {
	contributions: FinanceSnapshotContribution[]
	unknownAssets: number
} {
	const contributions: FinanceSnapshotContribution[] = []
	let unknownAssets = 0

	for (const account of input.bankAccounts) {
		const fact = getTrustworthyCurrentFact(
			account,
			ASSET_FACT_TYPES.bank_account,
		)
		if (!fact) {
			unknownAssets += 1
			continue
		}

		const contribution = buildContribution({
			entity: account,
			entityKind: 'bank_account',
			fact,
			valuationLevel: 'account_total',
		})

		if (contribution) {
			contributions.push(contribution)
		} else {
			unknownAssets += 1
		}
	}

	const investment = resolveInvestmentContributions({
		accounts: input.investmentAccounts,
		holdings: input.holdings,
	})

	contributions.push(...investment.contributions)
	unknownAssets += investment.unknownCount

	for (const holding of input.holdings) {
		if (holding.investmentAccountId) {
			continue
		}

		const fact = getTrustworthyCurrentFact(holding, ASSET_FACT_TYPES.holding)
		if (!fact) {
			unknownAssets += 1
			continue
		}

		const contribution = buildContribution({
			entity: holding,
			entityKind: 'holding',
			fact,
			valuationLevel: 'holding_value',
		})

		if (contribution) {
			contributions.push(contribution)
		} else {
			unknownAssets += 1
		}
	}

	return { contributions, unknownAssets }
}

function buildLiabilityContributions(input: {
	creditCards: CreditCardRecord[]
	loans: LoanRecord[]
}): {
	contributions: FinanceSnapshotContribution[]
	unknownLiabilities: number
} {
	const contributions: FinanceSnapshotContribution[] = []
	let unknownLiabilities = 0

	for (const loan of input.loans) {
		const fact = getTrustworthyCurrentFact(loan, LIABILITY_FACT_TYPES.loan)
		if (!fact) {
			unknownLiabilities += 1
			continue
		}

		const contribution = buildContribution({
			entity: loan,
			entityKind: 'loan',
			fact,
			valuationLevel: 'account_total',
		})

		if (contribution) {
			contributions.push(contribution)
		} else {
			unknownLiabilities += 1
		}
	}

	for (const card of input.creditCards) {
		const fact = getTrustworthyCurrentFact(
			card,
			LIABILITY_FACT_TYPES.credit_card,
		)
		if (!fact) {
			unknownLiabilities += 1
			continue
		}

		const contribution = buildContribution({
			entity: card,
			entityKind: 'credit_card',
			fact,
			valuationLevel: 'account_total',
		})

		if (contribution) {
			contributions.push(contribution)
		} else {
			unknownLiabilities += 1
		}
	}

	return { contributions, unknownLiabilities }
}

function buildSnapshotLimitations(input: {
	multiCurrency: boolean
	unknownAssets: number
	unknownLiabilities: number
	incompleteDocumentCount: number
	conflictingObservationCount: number
	ambiguousEntityCount: number
	hasValuedTotals: boolean
}): string[] {
	const limitations: string[] = []

	if (!input.hasValuedTotals) {
		limitations.push('Your financial picture is still taking shape.')
		return limitations
	}

	limitations.push(
		'Your current snapshot does not include all possible assets.',
	)

	if (input.unknownAssets > 0) {
		limitations.push('Some investments or accounts are not included.')
	}

	if (input.unknownLiabilities > 0) {
		limitations.push(
			'Current loan or card balance is unavailable for some records.',
		)
	}

	if (input.incompleteDocumentCount > 0) {
		limitations.push('Some records have not been reviewed.')
	}

	if (input.multiCurrency) {
		limitations.push('Multiple currencies detected.')
	}

	if (input.conflictingObservationCount > 0) {
		limitations.push('Some statement values disagree and need review.')
	}

	if (input.ambiguousEntityCount > 0) {
		limitations.push('Some accounts have ambiguous ownership.')
	}

	return limitations
}

function determineConfidence(input: {
	hasValuedTotals: boolean
	multiCurrency: boolean
	unknownAssets: number
	unknownLiabilities: number
	incompleteDocumentCount: number
	conflictingObservationCount: number
	ambiguousEntityCount: number
}): FinanceSnapshot['confidence'] {
	if (input.multiCurrency || !input.hasValuedTotals) {
		return 'insufficient'
	}

	if (
		input.unknownAssets > 0 ||
		input.unknownLiabilities > 0 ||
		input.incompleteDocumentCount > 0 ||
		input.conflictingObservationCount > 0 ||
		input.ambiguousEntityCount > 0
	) {
		return 'partial'
	}

	return 'high'
}

function buildConfidenceLabel(
	confidence: FinanceSnapshot['confidence'],
): string {
	switch (confidence) {
		case 'high':
			return 'Based on your available financial records.'
		case 'partial':
			return 'Your net worth is based on some of your financial records.'
		default:
			return 'Your financial picture is still taking shape.'
	}
}

function buildHistoryPreview(input: {
	entities: FinanceEntityBase[]
	currency: string | null
}): FinanceSnapshotHistoryPreview | null {
	if (!input.currency) {
		return null
	}

	let previousAssets = 0
	let previousLiabilities = 0
	let latestPreviousDate: string | null = null
	let hasPrevious = false

	for (const entity of input.entities) {
		for (const fact of entity.currentFacts) {
			if (!fact.previousValue || fact.hasConflict) {
				continue
			}

			const parsed = parseMoneyValue(fact.previousValue)
			if (!parsed || parsed.currency !== input.currency) {
				continue
			}

			if (
				ASSET_FACT_TYPES.bank_account.includes(
					fact.factType as 'closing_balance',
				) ||
				ASSET_FACT_TYPES.investment_account.includes(
					fact.factType as 'market_value',
				)
			) {
				previousAssets += parsed.amount
				hasPrevious = true
			}

			if (
				LIABILITY_FACT_TYPES.loan.includes(
					fact.factType as 'outstanding_principal',
				) ||
				LIABILITY_FACT_TYPES.credit_card.includes(
					fact.factType as 'total_amount_due',
				)
			) {
				previousLiabilities += parsed.amount
				hasPrevious = true
			}

			if (
				fact.previousAsOfDate &&
				(!latestPreviousDate ||
					Date.parse(fact.previousAsOfDate) > Date.parse(latestPreviousDate))
			) {
				latestPreviousDate = fact.previousAsOfDate
			}
		}
	}

	if (!hasPrevious) {
		return null
	}

	return {
		previousAssetsTotal: previousAssets,
		previousLiabilitiesTotal: previousLiabilities,
		previousNetWorth: previousAssets - previousLiabilities,
		asOfDate: latestPreviousDate,
		currency: input.currency,
	}
}

export function buildFinanceSnapshot(input: {
	bankAccounts: BankAccountRecord[]
	investmentAccounts: InvestmentAccountRecord[]
	creditCards: CreditCardRecord[]
	loans: LoanRecord[]
	holdings: HoldingRecord[]
	documents: FinanceDocumentRef[]
	coverage: FinanceCoverageMeta
}): FinanceSnapshot {
	const assets = buildAssetContributions({
		bankAccounts: input.bankAccounts,
		investmentAccounts: input.investmentAccounts,
		holdings: input.holdings,
	})
	const liabilities = buildLiabilityContributions({
		creditCards: input.creditCards,
		loans: input.loans,
	})

	const assetSum = sumMoneyAmounts(assets.contributions)
	const liabilitySum = sumMoneyAmounts(liabilities.contributions)
	const currencies = [
		...new Set([...assetSum.currencies, ...liabilitySum.currencies]),
	]
	const multiCurrency = currencies.length > 1
	const hasValuedTotals =
		assets.contributions.length > 0 || liabilities.contributions.length > 0

	const confidence = determineConfidence({
		hasValuedTotals,
		multiCurrency,
		unknownAssets: assets.unknownAssets,
		unknownLiabilities: liabilities.unknownLiabilities,
		incompleteDocumentCount: input.coverage.incompleteDocumentCount,
		conflictingObservationCount: input.coverage.conflictingObservationCount,
		ambiguousEntityCount: input.coverage.ambiguousEntityCount,
	})

	const canSum =
		!multiCurrency &&
		assetSum.currency &&
		(liabilitySum.currency == null ||
			liabilitySum.currency === assetSum.currency)

	const assetsTotal = canSum ? assetSum.total : null
	const liabilitiesTotal = canSum ? liabilitySum.total : null
	const hasLiabilityEntities =
		input.loans.length > 0 || input.creditCards.length > 0
	const hasAssetEntities =
		input.bankAccounts.length > 0 ||
		input.investmentAccounts.length > 0 ||
		input.holdings.length > 0

	const netWorth =
		canSum && assetsTotal != null && liabilitiesTotal != null
			? assetsTotal - liabilitiesTotal
			: canSum && assetsTotal != null && !hasLiabilityEntities
				? assetsTotal
				: canSum &&
					  assetsTotal == null &&
					  liabilitiesTotal != null &&
					  !hasAssetEntities
					? -liabilitiesTotal
					: null

	const currency = canSum ? (assetSum.currency ?? liabilitySum.currency) : null
	const showNetWorth =
		confidence !== 'insufficient' &&
		netWorth != null &&
		currency != null &&
		!(hasLiabilityEntities && liabilitiesTotal == null)

	const limitations = buildSnapshotLimitations({
		multiCurrency,
		unknownAssets: assets.unknownAssets,
		unknownLiabilities: liabilities.unknownLiabilities,
		incompleteDocumentCount: input.coverage.incompleteDocumentCount,
		conflictingObservationCount: input.coverage.conflictingObservationCount,
		ambiguousEntityCount: input.coverage.ambiguousEntityCount,
		hasValuedTotals,
	})

	const coverageDetail: FinanceSnapshotCoverageDetail = {
		knownAssets: assets.contributions.length,
		knownLiabilities: liabilities.contributions.length,
		unknownAssets: assets.unknownAssets,
		unknownLiabilities: liabilities.unknownLiabilities,
		documentsReviewed: input.coverage.extractedDocumentCount,
		documentsPending: input.coverage.incompleteDocumentCount,
		confidence,
		limitations,
	}

	const confidenceLabel = buildConfidenceLabel(confidence)

	let headline = 'Your financial picture is taking shape'
	let subline: string | null = null

	if (showNetWorth && currency && netWorth != null) {
		headline = 'Net Worth'
		subline = confidenceLabel
	} else if (hasValuedTotals) {
		subline = `Chronicle has identified ${assets.contributions.length} asset${assets.contributions.length === 1 ? '' : 's'} and ${liabilities.contributions.length} liabilit${liabilities.contributions.length === 1 ? 'y' : 'ies'}.`
		if (assets.unknownAssets + liabilities.unknownLiabilities > 0) {
			subline += ' Some financial records are still missing.'
		}
	}

	const allEntities: FinanceEntityBase[] = [
		...input.bankAccounts,
		...input.investmentAccounts,
		...input.creditCards,
		...input.loans,
		...input.holdings,
	]

	return {
		assetsTotal,
		liabilitiesTotal,
		netWorth,
		currency,
		currencies,
		confidence,
		confidenceLabel,
		showNetWorth,
		headline,
		subline,
		assetsDisplay:
			assetsTotal != null && currency
				? formatSnapshotMoney(assetsTotal, currency)
				: null,
		liabilitiesDisplay:
			liabilitiesTotal != null && currency
				? formatSnapshotMoney(liabilitiesTotal, currency)
				: null,
		netWorthDisplay:
			showNetWorth && netWorth != null && currency
				? formatSnapshotMoney(netWorth, currency)
				: null,
		assetContributions: assets.contributions,
		liabilityContributions: liabilities.contributions,
		coverage: coverageDetail,
		historyPreview: buildHistoryPreview({ entities: allEntities, currency }),
	}
}

export function buildFinanceSnapshotHomeView(
	snapshot: FinanceSnapshot,
	coverage: FinanceCoverageMeta,
): FinanceSnapshotHomeView {
	const needsReview =
		coverage.incompleteDocumentCount +
		coverage.ambiguousEntityCount +
		coverage.conflictingObservationCount
	const organizedCount = coverage.extractedDocumentCount

	return {
		showSnapshot:
			snapshot.showNetWorth ||
			snapshot.assetsTotal != null ||
			snapshot.liabilitiesTotal != null ||
			snapshot.coverage.knownAssets > 0 ||
			snapshot.coverage.knownLiabilities > 0,
		netWorthDisplay: snapshot.netWorthDisplay,
		assetsDisplay: snapshot.assetsDisplay,
		liabilitiesDisplay: snapshot.liabilitiesDisplay,
		confidenceLabel: snapshot.showNetWorth
			? snapshot.confidenceLabel
			: snapshot.subline,
		coverageLine:
			organizedCount > 0
				? needsReview > 0
					? `Based on the financial records Chronicle currently has · ${needsReview} still need review`
					: 'Based on the financial records Chronicle currently has'
				: null,
		limitations: snapshot.coverage.limitations,
	}
}

export function isExcludedLiabilityFactType(factType: string): boolean {
	return EXCLUDED_LIABILITY_FACT_TYPES.has(factType)
}
