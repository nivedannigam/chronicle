import type { UsageSignal } from '@/features/personalization/types/personal-context.types'

const STORAGE_KEY = 'chronicle:usage-signals'
const MAX_SIGNALS_PER_USER = 100

interface StoredUsageSignals {
	[userId: string]: UsageSignal[]
}

function readStore(): StoredUsageSignals {
	if (typeof window === 'undefined') {
		return {}
	}

	try {
		const raw = window.localStorage.getItem(STORAGE_KEY)

		if (!raw) {
			return {}
		}

		return JSON.parse(raw) as StoredUsageSignals
	} catch {
		return {}
	}
}

function writeStore(store: StoredUsageSignals): void {
	if (typeof window === 'undefined') {
		return
	}

	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
	} catch {
		// Ignore quota errors in beta.
	}
}

export function recordUsageSignal(signal: UsageSignal): void {
	const store = readStore()
	const existing = store[signal.userId] ?? []

	store[signal.userId] = [...existing, signal].slice(-MAX_SIGNALS_PER_USER)
	writeStore(store)
}

export function getUsageSignals(userId: string): UsageSignal[] {
	return readStore()[userId] ?? []
}

export function getFrequentTopicsForMember(
	userId: string,
	memberId: string | null,
	limit = 5,
): string[] {
	const counts = new Map<string, number>()

	for (const signal of getUsageSignals(userId)) {
		if (signal.memberId !== memberId || !signal.topic) {
			continue
		}

		counts.set(signal.topic, (counts.get(signal.topic) ?? 0) + 1)
	}

	return [...counts.entries()]
		.sort((left, right) => right[1] - left[1])
		.slice(0, limit)
		.map(([topic]) => topic)
}

export function getFrequentlyAccessedReportIds(
	userId: string,
	memberId: string | null,
	limit = 5,
): string[] {
	const counts = new Map<string, number>()

	for (const signal of getUsageSignals(userId)) {
		if (signal.memberId !== memberId || !signal.reportId) {
			continue
		}

		counts.set(signal.reportId, (counts.get(signal.reportId) ?? 0) + 1)
	}

	return [...counts.entries()]
		.sort((left, right) => right[1] - left[1])
		.slice(0, limit)
		.map(([reportId]) => reportId)
}

/** Privacy guard — signals must never cross user boundaries. */
export function filterUsageSignalsForUser(
	userId: string,
	signals: UsageSignal[],
): UsageSignal[] {
	return signals.filter((signal) => signal.userId === userId)
}
