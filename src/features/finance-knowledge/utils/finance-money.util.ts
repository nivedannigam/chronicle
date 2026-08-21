export interface ParsedMoney {
	amount: number
	currency: string
}

export function parseMoneyValue(
	value: string | null | undefined,
): ParsedMoney | null {
	if (!value?.trim()) {
		return null
	}

	const normalized = value.trim()
	const prefixed = normalized.match(/^([A-Z]{3})\s+([\d,]+(?:\.\d+)?)$/)
	if (prefixed) {
		const amount = Number.parseFloat(prefixed[2]!.replace(/,/g, ''))
		if (!Number.isFinite(amount)) {
			return null
		}

		return { amount, currency: prefixed[1]! }
	}

	const numeric = normalized.match(/^([\d,]+(?:\.\d+)?)$/)
	if (numeric) {
		const amount = Number.parseFloat(numeric[1]!.replace(/,/g, ''))
		if (!Number.isFinite(amount)) {
			return null
		}

		return { amount, currency: 'INR' }
	}

	return null
}

export function formatSnapshotMoney(amount: number, currency: string): string {
	const rounded = Math.round(amount)

	if (currency === 'INR') {
		return `₹${rounded.toLocaleString('en-IN')}`
	}

	return `${currency} ${rounded.toLocaleString('en-IN')}`
}

export function sumMoneyAmounts(
	contributions: Array<{ amount: number; currency: string }>,
): { total: number | null; currency: string | null; currencies: string[] } {
	const currencies = [...new Set(contributions.map((entry) => entry.currency))]

	if (currencies.length === 0) {
		return { total: null, currency: null, currencies: [] }
	}

	if (currencies.length > 1) {
		return { total: null, currency: null, currencies }
	}

	const total = contributions.reduce((sum, entry) => sum + entry.amount, 0)
	return { total, currency: currencies[0] ?? null, currencies }
}
