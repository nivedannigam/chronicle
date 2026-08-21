import type {
	FinanceEntityKind,
	FinanceExtractableDocumentType,
} from '@/features/finance-knowledge/types/finance-extraction.types'

function normalizeKey(value: string | null | undefined): string {
	return (value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

export function resolveFinanceEntityKind(
	documentType: FinanceExtractableDocumentType,
): FinanceEntityKind {
	switch (documentType) {
		case 'credit-card-statement':
			return 'credit_card'
		case 'loan-statement':
			return 'loan'
		case 'investment-statement':
			return 'investment_account'
		default:
			return 'bank_account'
	}
}

export function buildFinanceEntityDedupeKey(input: {
	kind: FinanceEntityKind
	institutionName: string | null
	maskedIdentifier: string | null
}): string | null {
	const institution = normalizeKey(input.institutionName)
	const identifier = normalizeKey(input.maskedIdentifier?.replace(/\*/g, ''))

	if (identifier && identifier.length >= 4) {
		return `${input.kind}:${institution}:${identifier.slice(-4)}`
	}

	return null
}

export function resolveFinanceEntityId(input: {
	kind: FinanceEntityKind
	institutionName: string | null
	maskedIdentifier: string | null
	fallbackLabel: string
}): string {
	const dedupeKey = buildFinanceEntityDedupeKey(input)

	if (dedupeKey) {
		return `finance-${dedupeKey}`
	}

	return `finance-${input.kind}-${normalizeKey(input.fallbackLabel) || 'unlinked'}`
}

export function shouldMergeFinanceEntities(
	leftKey: string | null,
	rightKey: string | null,
): boolean {
	if (!leftKey || !rightKey) {
		return false
	}

	return leftKey === rightKey
}

export function buildFinanceEntityDisplayName(input: {
	kind: FinanceEntityKind
	institutionName: string | null
	accountType: string | null
	cardName: string | null
	loanType: string | null
	schemeName: string | null
	fallbackLabel: string
}): string {
	if (input.kind === 'credit_card') {
		return [input.institutionName, input.cardName ?? 'Credit Card']
			.filter(Boolean)
			.join(' ')
	}

	if (input.kind === 'loan') {
		return [input.institutionName, input.loanType ?? 'Loan']
			.filter(Boolean)
			.join(' ')
	}

	if (input.kind === 'investment_account') {
		return [input.institutionName, input.schemeName ?? 'Investment Account']
			.filter(Boolean)
			.join(' ')
	}

	return [input.institutionName, input.accountType ?? 'Account']
		.filter(Boolean)
		.join(' ')
}
