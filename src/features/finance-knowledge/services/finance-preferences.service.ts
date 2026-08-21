import { maskAccountIdentifier } from '@/features/finance-knowledge/services/finance-mask.service'

const STORAGE_PREFIX = 'chronicle:finance-preferences:'

export interface FinancePreferences {
	maskAccountNumbers: boolean
	hideBalancesInLists: boolean
	hideSensitiveTimelinePreviews: boolean
}

const DEFAULT_PREFERENCES: FinancePreferences = {
	maskAccountNumbers: true,
	hideBalancesInLists: true,
	hideSensitiveTimelinePreviews: true,
}

function storageKey(userId: string): string {
	return `${STORAGE_PREFIX}${userId}`
}

export function readFinancePreferences(userId: string): FinancePreferences {
	if (typeof window === 'undefined') {
		return DEFAULT_PREFERENCES
	}

	try {
		const raw = window.localStorage.getItem(storageKey(userId))
		if (!raw) {
			return DEFAULT_PREFERENCES
		}

		return {
			...DEFAULT_PREFERENCES,
			...(JSON.parse(raw) as FinancePreferences),
		}
	} catch {
		return DEFAULT_PREFERENCES
	}
}

export function writeFinancePreferences(
	userId: string,
	preferences: Partial<FinancePreferences>,
): FinancePreferences {
	const next = { ...readFinancePreferences(userId), ...preferences }

	if (typeof window !== 'undefined') {
		window.localStorage.setItem(storageKey(userId), JSON.stringify(next))
	}

	return next
}

export function maskFinanceIdentifier(
	value: string | null | undefined,
	preferences: FinancePreferences,
): string | null {
	if (!value) {
		return null
	}

	if (!preferences.maskAccountNumbers) {
		return value
	}

	return maskAccountIdentifier(value)
}
