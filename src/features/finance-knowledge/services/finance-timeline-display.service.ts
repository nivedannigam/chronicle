import { compareFinancialDates } from '@/features/finance-knowledge/services/finance-observation.service'
import type { FinanceTimelineEvent } from '@/features/finance-knowledge/types/finance-timeline.types'
import {
	parseMoneyValue,
	formatSnapshotMoney,
} from '@/features/finance-knowledge/utils/finance-money.util'

export interface FinanceTimelineMonthGroup {
	key: string
	label: string
	year: number
	month: number
	events: FinanceTimelineEvent[]
}

export interface FinanceTimelineYearGroup {
	year: number
	months: FinanceTimelineMonthGroup[]
}

export function formatFinanceEventDate(eventDate: string): string {
	const date = new Date(eventDate)
	if (Number.isNaN(date.getTime())) {
		return eventDate
	}

	return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export function formatFinanceEventMonthLabel(
	year: number,
	month: number,
): string {
	return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
		month: 'long',
	})
}

export function formatFinanceValueChange(
	previousValue: string | null,
	currentValue: string | null,
	options?: { hideBalances?: boolean },
): string | null {
	if (options?.hideBalances) {
		return null
	}

	if (!previousValue || !currentValue) {
		return null
	}

	const previous = parseMoneyValue(previousValue)
	const current = parseMoneyValue(currentValue)

	if (previous && current && previous.currency === current.currency) {
		return `${formatSnapshotMoney(previous.amount, previous.currency)} → ${formatSnapshotMoney(current.amount, current.currency)}`
	}

	return `${previousValue} → ${currentValue}`
}

export function groupFinanceTimelineEvents(
	events: FinanceTimelineEvent[],
): FinanceTimelineYearGroup[] {
	const sorted = [...events].sort((left, right) =>
		compareFinancialDates(right.eventDate, left.eventDate),
	)

	const monthMap = new Map<string, FinanceTimelineMonthGroup>()

	for (const event of sorted) {
		const date = new Date(event.eventDate)
		const year = date.getFullYear()
		const month = date.getMonth() + 1
		const key = `${year}-${String(month).padStart(2, '0')}`

		const existing = monthMap.get(key)
		if (existing) {
			existing.events.push(event)
			continue
		}

		monthMap.set(key, {
			key,
			label: formatFinanceEventMonthLabel(year, month),
			year,
			month,
			events: [event],
		})
	}

	const yearMap = new Map<number, FinanceTimelineMonthGroup[]>()

	for (const group of monthMap.values()) {
		const existing = yearMap.get(group.year) ?? []
		existing.push(group)
		yearMap.set(group.year, existing)
	}

	return [...yearMap.entries()]
		.sort(([leftYear], [rightYear]) => rightYear - leftYear)
		.map(([year, months]) => ({
			year,
			months: months.sort((left, right) => right.month - left.month),
		}))
}

export function resolveFinanceHistoryEmptyCopy(input: {
	hasDocuments: boolean
	eventCount: number
}): { title: string; body: string } {
	if (input.eventCount > 0) {
		return { title: '', body: '' }
	}

	if (input.hasDocuments) {
		return {
			title: 'Your financial story is still forming',
			body: 'Your records are here. Financial history will appear as they become organized.',
		}
	}

	return {
		title: 'Your financial history will appear here',
		body: 'As Chronicle learns more about your accounts and records, meaningful financial changes will show up here.',
	}
}
