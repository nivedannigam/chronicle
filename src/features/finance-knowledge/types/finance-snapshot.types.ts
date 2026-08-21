export type FinanceSnapshotConfidence = 'high' | 'partial' | 'insufficient'

export type FinanceValuationLevel = 'account_total' | 'holding_value'

export interface FinanceSnapshotContribution {
	entityId: string
	entityKind: string
	displayName: string
	factType: string
	amount: number
	currency: string
	asOfDate: string | null
	sourceDocumentId: string | null
	valuationLevel: FinanceValuationLevel
}

export interface FinanceSnapshotCoverageDetail {
	knownAssets: number
	knownLiabilities: number
	unknownAssets: number
	unknownLiabilities: number
	documentsReviewed: number
	documentsPending: number
	confidence: FinanceSnapshotConfidence
	limitations: string[]
}

export interface FinanceSnapshotHistoryPreview {
	previousAssetsTotal: number | null
	previousLiabilitiesTotal: number | null
	previousNetWorth: number | null
	asOfDate: string | null
	currency: string | null
}

export interface FinanceSnapshot {
	assetsTotal: number | null
	liabilitiesTotal: number | null
	netWorth: number | null
	currency: string | null
	currencies: string[]
	confidence: FinanceSnapshotConfidence
	confidenceLabel: string
	showNetWorth: boolean
	headline: string
	subline: string | null
	assetsDisplay: string | null
	liabilitiesDisplay: string | null
	netWorthDisplay: string | null
	assetContributions: FinanceSnapshotContribution[]
	liabilityContributions: FinanceSnapshotContribution[]
	coverage: FinanceSnapshotCoverageDetail
	historyPreview: FinanceSnapshotHistoryPreview | null
}

export interface FinanceSnapshotHomeView {
	showSnapshot: boolean
	netWorthDisplay: string | null
	assetsDisplay: string | null
	liabilitiesDisplay: string | null
	confidenceLabel: string | null
	coverageLine: string | null
	limitations: string[]
}
