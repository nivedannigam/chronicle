import {
	DEFAULT_INSURANCE_PREFERENCES,
	type InsuranceModulePreferences,
} from '@/features/insurance/types/insurance-preferences.types'

const STORAGE_PREFIX = 'chronicle:insurance:preferences:'

function storageKey(userId: string): string {
	return `${STORAGE_PREFIX}${userId}`
}

export function loadInsurancePreferences(
	userId: string,
): InsuranceModulePreferences {
	if (typeof window === 'undefined' || !userId) {
		return DEFAULT_INSURANCE_PREFERENCES
	}

	try {
		const raw = window.localStorage.getItem(storageKey(userId))

		if (!raw) {
			return DEFAULT_INSURANCE_PREFERENCES
		}

		return {
			...DEFAULT_INSURANCE_PREFERENCES,
			...(JSON.parse(raw) as Partial<InsuranceModulePreferences>),
			notifications: {
				...DEFAULT_INSURANCE_PREFERENCES.notifications,
				...((JSON.parse(raw) as Partial<InsuranceModulePreferences>)
					.notifications ?? {}),
			},
		}
	} catch {
		return DEFAULT_INSURANCE_PREFERENCES
	}
}

export function saveInsurancePreferences(
	userId: string,
	preferences: InsuranceModulePreferences,
): void {
	if (typeof window === 'undefined' || !userId) {
		return
	}

	window.localStorage.setItem(storageKey(userId), JSON.stringify(preferences))
}

export function patchInsurancePreferences(
	userId: string,
	patch: Partial<InsuranceModulePreferences>,
): InsuranceModulePreferences {
	const current = loadInsurancePreferences(userId)
	const next = {
		...current,
		...patch,
		notifications: {
			...current.notifications,
			...(patch.notifications ?? {}),
		},
	}

	saveInsurancePreferences(userId, next)

	return next
}

export function clearInsurancePreferences(userId: string): void {
	if (typeof window === 'undefined' || !userId) {
		return
	}

	window.localStorage.removeItem(storageKey(userId))
}

export function recordInsuranceLastScan(
	userId: string,
): InsuranceModulePreferences {
	return patchInsurancePreferences(userId, {
		lastScannedAt: new Date().toISOString(),
	})
}
