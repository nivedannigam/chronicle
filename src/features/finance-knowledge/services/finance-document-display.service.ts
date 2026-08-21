import type { FinanceDocumentType } from '@/features/finance-knowledge/types/finance-classification.types'
import { getFinanceDocumentTypeLabel } from '@/features/finance-knowledge/services/finance-document-classifier.service'

const GENERIC_FILE_NAMES = new Set([
	'statement.pdf',
	'statement',
	'document.pdf',
	'file.pdf',
])

function normalizeSegment(value: string): string {
	return value.trim().replace(/[_-]+/g, ' ')
}

function titleCase(value: string): string {
	return value
		.split(/\s+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
		.join(' ')
}

function extractFolderContext(
	folderPath: string | null | undefined,
): string | null {
	if (!folderPath?.trim()) {
		return null
	}

	const segments = folderPath.split('/').map(normalizeSegment).filter(Boolean)

	if (segments.length === 0) {
		return null
	}

	const financeIndex = segments.findIndex((segment) =>
		/^finance$/i.test(segment),
	)
	const relevant =
		financeIndex >= 0 ? segments.slice(financeIndex + 1) : segments

	const ignored = new Set([
		'bank',
		'banks',
		'investments',
		'investment',
		'loans',
		'loan',
		'credit cards',
		'credit card',
		'tax',
		'nps',
		'epf',
		'ppf',
		'mutual funds',
		'mutual fund',
		'itr',
		'home',
	])

	const meaningful = relevant.filter(
		(segment) => !ignored.has(segment.toLowerCase()),
	)

	if (meaningful.length > 0) {
		return titleCase(meaningful[meaningful.length - 1]!)
	}

	if (relevant.length > 0) {
		return titleCase(relevant[relevant.length - 1]!)
	}

	return null
}

function extractFileNameContext(fileName: string): string | null {
	const baseName = fileName.replace(/\.[^.]+$/, '').trim()
	if (!baseName || GENERIC_FILE_NAMES.has(baseName.toLowerCase())) {
		return null
	}

	const cleaned = baseName
		.replace(
			/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)\b/gi,
			'',
		)
		.replace(/\b(20\d{2}|fy\s*20\d{2}|ay\s*20\d{2}[-/]?\d{2})\b/gi, '')
		.replace(
			/\b(statement|acknowledgement|acknowledgment|record|document|pdf)\b/gi,
			'',
		)
		.replace(/\s+/g, ' ')
		.trim()

	if (!cleaned || cleaned.length < 3) {
		return null
	}

	return titleCase(cleaned)
}

export function buildFinanceDocumentDisplayLabel(input: {
	fileName: string
	folderPath?: string | null
	classificationType: FinanceDocumentType
}): string {
	const folderContext = extractFolderContext(input.folderPath)
	const fileContext = extractFileNameContext(input.fileName)
	const typeLabel = getFinanceDocumentTypeLabel(input.classificationType)

	if (folderContext && fileContext && folderContext !== fileContext) {
		return folderContext
	}

	return folderContext ?? fileContext ?? typeLabel
}

export function buildFinanceLibraryTitle(input: {
	displayLabel: string
}): string {
	return `Finance · ${input.displayLabel}`
}
