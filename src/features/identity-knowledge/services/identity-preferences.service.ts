import { maskDocumentNumber } from '@/features/identity-knowledge/services/identity-mask.service'

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

const SENSITIVE_FIELD_LABELS = new Set([
	'Document number',
	'Passport number',
	'PAN',
	'Aadhaar number',
])

export function maskIdentityDisplayFieldValue(
	label: string,
	value: string,
	preferences: IdentityPreferences,
): string {
	if (!preferences.maskDocumentNumbers) {
		return value
	}

	if (!SENSITIVE_FIELD_LABELS.has(label)) {
		return value
	}

	return maskDocumentNumber(value) ?? '••••'
}

export function applyIdentityTimelinePrivacy(
	summary: string,
	event: { tags?: string[]; metadata?: Record<string, unknown> },
	preferences: IdentityPreferences,
): string {
	if (!preferences.hideSensitiveTimelinePreviews) {
		return summary
	}

	if (!event.tags?.includes('identity')) {
		return summary
	}

	const documentNumber =
		typeof event.metadata?.documentNumber === 'string'
			? event.metadata.documentNumber
			: null

	if (documentNumber) {
		const masked = maskDocumentNumber(documentNumber)
		if (masked) {
			return summary.replace(documentNumber, masked)
		}
	}

	return summary.replace(/No\.\s*[\w-]+/gi, 'No. ••••')
}
