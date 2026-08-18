const STORAGE_PREFIX = 'chronicle:identity-preferences:'

export interface IdentityPreferences {
	maskDocumentNumbers: boolean
	hideSensitiveTimelinePreviews: boolean
}

const DEFAULT_PREFERENCES: IdentityPreferences = {
	maskDocumentNumbers: true,
	hideSensitiveTimelinePreviews: true,
}

function storageKey(userId: string): string {
	return `${STORAGE_PREFIX}${userId}`
}

export function readIdentityPreferences(userId: string): IdentityPreferences {
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
			...(JSON.parse(raw) as IdentityPreferences),
		}
	} catch {
		return DEFAULT_PREFERENCES
	}
}

export function writeIdentityPreferences(
	userId: string,
	preferences: Partial<IdentityPreferences>,
): IdentityPreferences {
	const next = { ...readIdentityPreferences(userId), ...preferences }

	if (typeof window !== 'undefined') {
		window.localStorage.setItem(storageKey(userId), JSON.stringify(next))
	}

	return next
}
