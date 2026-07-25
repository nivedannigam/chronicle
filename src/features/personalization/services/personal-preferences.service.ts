import type { ChroniclePersonalPreferences } from '@/features/personalization/types/personal-context.types'
import { DEFAULT_PERSONAL_PREFERENCES } from '@/features/personalization/types/personal-context.types'

const STORAGE_PREFIX = 'chronicle:personal-preferences:'

function storageKey(userId: string): string {
	return `${STORAGE_PREFIX}${userId}`
}

function isCommunicationStyle(
	value: unknown,
): value is ChroniclePersonalPreferences['communicationStyle'] {
	return value === 'simple' || value === 'detailed' || value === 'clinical'
}

function isUnitPreference(
	value: unknown,
): value is ChroniclePersonalPreferences['units'] {
	return value === 'metric' || value === 'imperial'
}

function isDisplayFormat(
	value: unknown,
): value is ChroniclePersonalPreferences['displayFormat'] {
	return value === 'summary' || value === 'detailed'
}

function isDashboardLayout(
	value: unknown,
): value is ChroniclePersonalPreferences['dashboardLayout'] {
	return value === 'compact' || value === 'expanded'
}

export function parsePersonalPreferences(
	raw: Record<string, unknown> | null | undefined,
): ChroniclePersonalPreferences {
	if (!raw) {
		return { ...DEFAULT_PERSONAL_PREFERENCES }
	}

	const notifications = raw.notificationPreferences as
		Partial<ChroniclePersonalPreferences['notificationPreferences']> | undefined

	return {
		language:
			typeof raw.language === 'string'
				? raw.language
				: DEFAULT_PERSONAL_PREFERENCES.language,
		units: isUnitPreference(raw.units)
			? raw.units
			: DEFAULT_PERSONAL_PREFERENCES.units,
		communicationStyle: isCommunicationStyle(raw.communicationStyle)
			? raw.communicationStyle
			: DEFAULT_PERSONAL_PREFERENCES.communicationStyle,
		displayFormat: isDisplayFormat(raw.displayFormat)
			? raw.displayFormat
			: DEFAULT_PERSONAL_PREFERENCES.displayFormat,
		dashboardLayout: isDashboardLayout(raw.dashboardLayout)
			? raw.dashboardLayout
			: DEFAULT_PERSONAL_PREFERENCES.dashboardLayout,
		notificationPreferences: {
			healthAlerts:
				typeof notifications?.healthAlerts === 'boolean'
					? notifications.healthAlerts
					: DEFAULT_PERSONAL_PREFERENCES.notificationPreferences.healthAlerts,
			importComplete:
				typeof notifications?.importComplete === 'boolean'
					? notifications.importComplete
					: DEFAULT_PERSONAL_PREFERENCES.notificationPreferences.importComplete,
		},
		frequentlyAccessedReportIds: Array.isArray(raw.frequentlyAccessedReportIds)
			? raw.frequentlyAccessedReportIds.filter(
					(item) => typeof item === 'string',
				)
			: [],
		frequentTopics: Array.isArray(raw.frequentTopics)
			? raw.frequentTopics.filter((item) => typeof item === 'string')
			: [],
	}
}

export function loadLocalPersonalPreferences(
	userId: string,
): ChroniclePersonalPreferences {
	if (typeof window === 'undefined' || !userId) {
		return { ...DEFAULT_PERSONAL_PREFERENCES }
	}

	try {
		const raw = window.localStorage.getItem(storageKey(userId))

		if (!raw) {
			return { ...DEFAULT_PERSONAL_PREFERENCES }
		}

		return parsePersonalPreferences(JSON.parse(raw) as Record<string, unknown>)
	} catch {
		return { ...DEFAULT_PERSONAL_PREFERENCES }
	}
}

export function saveLocalPersonalPreferences(
	userId: string,
	preferences: ChroniclePersonalPreferences,
): void {
	if (typeof window === 'undefined' || !userId) {
		return
	}

	try {
		window.localStorage.setItem(storageKey(userId), JSON.stringify(preferences))
	} catch {
		// Ignore quota errors in beta.
	}
}

export function mergePersonalPreferences(
	remote: Record<string, unknown> | null | undefined,
	local: ChroniclePersonalPreferences,
): ChroniclePersonalPreferences {
	const parsedRemote = parsePersonalPreferences(remote ?? {})
	const mergedTopics = [
		...new Set([...parsedRemote.frequentTopics, ...local.frequentTopics]),
	].slice(0, 12)
	const mergedReports = [
		...new Set([
			...parsedRemote.frequentlyAccessedReportIds,
			...local.frequentlyAccessedReportIds,
		]),
	].slice(0, 20)

	return {
		...parsedRemote,
		...local,
		notificationPreferences: {
			...parsedRemote.notificationPreferences,
			...local.notificationPreferences,
		},
		frequentTopics: mergedTopics,
		frequentlyAccessedReportIds: mergedReports,
	}
}

export function personalPreferencesToRecord(
	preferences: ChroniclePersonalPreferences,
): Record<string, unknown> {
	return { ...preferences }
}
