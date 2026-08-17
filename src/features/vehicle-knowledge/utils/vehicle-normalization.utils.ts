/** Normalized comparison form — strips spaces and uppercases. */
export function normalizeRegistrationNumber(value: string): string {
	return value.replace(/[\s-]/g, '').toUpperCase()
}

/** Display-friendly Indian registration format when pattern matches. */
export function formatRegistrationNumber(value: string): string {
	const normalized = normalizeRegistrationNumber(value)
	const match = normalized.match(/^([A-Z]{2})(\d{1,2})([A-Z]{1,3})(\d{1,4})$/)

	if (match) {
		return `${match[1]} ${match[2]} ${match[3]} ${match[4]}`
	}

	return value.trim().replace(/\s+/g, ' ').toUpperCase()
}

export function normalizeVin(value: string): string {
	return value.replace(/[\s-]/g, '').toUpperCase()
}

export function normalizeEngineNumber(value: string): string {
	return value.replace(/[\s-]/g, '').toUpperCase()
}

export function registrationNumbersMatch(left: string, right: string): boolean {
	return (
		normalizeRegistrationNumber(left) === normalizeRegistrationNumber(right)
	)
}

export function vinNumbersMatch(left: string, right: string): boolean {
	return normalizeVin(left) === normalizeVin(right)
}

export function engineNumbersMatch(left: string, right: string): boolean {
	return normalizeEngineNumber(left) === normalizeEngineNumber(right)
}

const ISO_DATE = /^(20\d{2}|19\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const FLEXIBLE_DATE =
	/(20\d{2}|19\d{2})[-_/.\s](0?[1-9]|1[0-2])[-_/.\s](0?[1-9]|[12]\d|3[01])/
const DMY_DATE = /(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.](\d{2,4})/

export function parseFlexibleDate(text: string): string | null {
	const trimmed = text.trim()

	if (ISO_DATE.test(trimmed)) {
		return trimmed
	}

	const isoMatch = trimmed.match(FLEXIBLE_DATE)

	if (isoMatch) {
		const year = isoMatch[1]
		const month = isoMatch[2].padStart(2, '0')
		const day = isoMatch[3].padStart(2, '0')
		const iso = `${year}-${month}-${day}`

		return Number.isNaN(Date.parse(iso)) ? null : iso
	}

	const dmyMatch = trimmed.match(DMY_DATE)

	if (dmyMatch) {
		const day = dmyMatch[1].padStart(2, '0')
		const month = dmyMatch[2].padStart(2, '0')
		const yearRaw = dmyMatch[3]
		const year =
			yearRaw.length === 2
				? `20${yearRaw}`
				: yearRaw.length === 4
					? yearRaw
					: null

		if (!year) {
			return null
		}

		const iso = `${year}-${month}-${day}`

		return Number.isNaN(Date.parse(iso)) ? null : iso
	}

	return null
}

export function parseDateFromSearchableText(text: string): string | null {
	const match = text.match(FLEXIBLE_DATE)

	if (!match) {
		return parseFlexibleDate(text)
	}

	return parseFlexibleDate(`${match[1]}-${match[2]}-${match[3]}`)
}

export function parseIndianRegistration(text: string): string | null {
	const match = text.match(/\b([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{1,4})\b/i)

	return match ? formatRegistrationNumber(match[1]) : null
}

export interface ParsedAmount {
	amount: number
	currency: string
	rawValue: string
}

export function parseAmount(text: string): ParsedAmount | null {
	const inrMatch = text.match(/(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d{1,2})?)/i)
	const genericMatch = text.match(
		/(?:amount|premium|idv|total)[:\s]*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d{1,2})?)/i,
	)
	const raw = (inrMatch?.[1] ?? genericMatch?.[1] ?? '').replace(/,/g, '')

	if (!raw) {
		return null
	}

	const amount = Number.parseFloat(raw)

	if (Number.isNaN(amount)) {
		return null
	}

	return {
		amount,
		currency: 'INR',
		rawValue: inrMatch?.[0] ?? genericMatch?.[0] ?? raw,
	}
}

export interface ParsedMileage {
	value: number
	unit: 'km' | 'mi'
	rawValue: string
}

export function parseMileage(text: string): ParsedMileage | null {
	const match = text.match(
		/(?:odometer|mileage|km reading|kms?)[:\s]*([\d,]+)\s*(km|kms|mi|miles)?/i,
	)

	if (!match) {
		return null
	}

	const value = Number.parseInt(match[1].replace(/,/g, ''), 10)

	if (Number.isNaN(value)) {
		return null
	}

	const unitToken = (match[2] ?? 'km').toLowerCase()
	const unit: ParsedMileage['unit'] = unitToken.startsWith('mi') ? 'mi' : 'km'

	return {
		value,
		unit,
		rawValue: match[0],
	}
}
