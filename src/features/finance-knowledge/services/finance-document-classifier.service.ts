import { resolveFinanceDocumentClassification } from '@/features/document-intelligence/classification/resolve-domain-classification.service'
import type {
	FinanceClassificationConfidence,
	FinanceClassificationSource,
	FinanceDocumentClassification,
	FinanceDocumentType,
} from '@/features/finance-knowledge/types/finance-classification.types'

export const FINANCE_DOCUMENT_TYPES = [
	'bank-statement',
	'credit-card-statement',
	'loan-statement',
	'investment-statement',
	'tax-record',
	'nps-statement',
	'epf-statement',
	'ppf-statement',
	'fd-statement',
	'salary-slip',
	'insurance-financial',
	'other',
] as const

/** @deprecated Use FinanceDocumentType */
export type FinanceSubCategoryId = FinanceDocumentType

/** @deprecated Use FINANCE_DOCUMENT_TYPES */
export const FINANCE_SUBCATEGORY_IDS = FINANCE_DOCUMENT_TYPES

const TYPE_LABELS: Record<FinanceDocumentType, string> = {
	'bank-statement': 'Bank statements',
	'credit-card-statement': 'Credit card statements',
	'loan-statement': 'Loan statements',
	'investment-statement': 'Investment statements',
	'tax-record': 'Tax records',
	'nps-statement': 'NPS statements',
	'epf-statement': 'EPF statements',
	'ppf-statement': 'PPF statements',
	'fd-statement': 'Fixed deposit statements',
	'salary-slip': 'Salary slips',
	'insurance-financial': 'Insurance financial records',
	other: 'Other',
}

interface SignalMatch {
	type: FinanceDocumentType
	strength: 'strong' | 'moderate' | 'weak'
	channel: 'filename' | 'folder' | 'content' | 'existing' | 'metadata'
}

const FILENAME_RULES: {
	type: FinanceDocumentType
	strong: RegExp[]
	moderate: RegExp[]
}[] = [
	{
		type: 'credit-card-statement',
		strong: [
			/credit\s*card\s*statement/i,
			/\bcard\s*statement\b/i,
			/\bvisa\b.*statement/i,
			/\bmastercard\b.*statement/i,
		],
		moderate: [/\bcredit\s*card\b/i, /\binfinia\b/i],
	},
	{
		type: 'loan-statement',
		strong: [
			/\bhome\s*loan\s*statement/i,
			/\bloan\s*statement/i,
			/\bemi\s*statement/i,
		],
		moderate: [/\bhome\s*loan\b/i, /\bloan\b/i, /\bemi\b/i],
	},
	{
		type: 'nps-statement',
		strong: [/\bnps\s*(transaction\s*)?statement/i],
		moderate: [/\bnps\b/i],
	},
	{
		type: 'epf-statement',
		strong: [/\bepf\s*statement/i, /\bemployee\s*provident\s*fund/i],
		moderate: [/\bepf\b/i],
	},
	{
		type: 'ppf-statement',
		strong: [/\bppf\s*statement/i, /\bpublic\s*provident\s*fund/i],
		moderate: [/\bppf\b/i],
	},
	{
		type: 'fd-statement',
		strong: [/\bfixed\s*deposit\s*statement/i, /\bfd\s*statement/i],
		moderate: [/\bfixed\s*deposit\b/i, /\bfd\b/i],
	},
	{
		type: 'salary-slip',
		strong: [/\bsalary\s*slip/i, /\bpay\s*slip/i, /\bpayslip/i],
		moderate: [/\bsalary\b/i],
	},
	{
		type: 'tax-record',
		strong: [
			/\bitr\s*acknowledgement/i,
			/\btax\s*return/i,
			/\bincome\s*tax\s*return/i,
			/\bform\s*16\b/i,
		],
		moderate: [/\bitr\b/i, /\btax\b/i, /\bassessment\b/i],
	},
	{
		type: 'investment-statement',
		strong: [
			/\bmutual\s*fund\s*statement/i,
			/\binvestment\s*statement/i,
			/\bdemat\s*statement/i,
			/\bportfolio\s*statement/i,
		],
		moderate: [
			/\bmutual\s*fund/i,
			/\binvestment\b/i,
			/\bportfolio\b/i,
			/\bdemat\b/i,
			/\bstock\b/i,
		],
	},
	{
		type: 'bank-statement',
		strong: [
			/\bbank\s*statement/i,
			/\baccount\s*statement/i,
			/\bsavings\s*account\s*statement/i,
			/\bcurrent\s*account\s*statement/i,
		],
		moderate: [/\bsavings\b/i, /\bcurrent\s*account\b/i],
	},
	{
		type: 'insurance-financial',
		strong: [
			/\binsurance\s*premium\s*receipt/i,
			/\blic\s*premium/i,
			/\bpremium\s*receipt/i,
		],
		moderate: [/\binsurance\s*premium\b/i, /\blic\b/i],
	},
]

const FOLDER_RULES: {
	type: FinanceDocumentType
	patterns: RegExp[]
}[] = [
	{ type: 'credit-card-statement', patterns: [/\/credit\s*cards?\//i] },
	{ type: 'loan-statement', patterns: [/\/loans?\//i, /\/home\s*loan\//i] },
	{ type: 'nps-statement', patterns: [/\/nps\//i] },
	{ type: 'epf-statement', patterns: [/\/epf\//i] },
	{ type: 'ppf-statement', patterns: [/\/ppf\//i] },
	{ type: 'tax-record', patterns: [/\/tax\//i, /\/itr\//i] },
	{
		type: 'investment-statement',
		patterns: [/\/investments?\//i, /\/mutual\s*funds?\//i, /\/demat\//i],
	},
	{ type: 'bank-statement', patterns: [/\/bank\//i, /\/banks\//i] },
]

const CONTRADICTION_PAIRS: [FinanceDocumentType, FinanceDocumentType][] = [
	['bank-statement', 'credit-card-statement'],
	['bank-statement', 'loan-statement'],
	['investment-statement', 'bank-statement'],
	['nps-statement', 'investment-statement'],
	['epf-statement', 'investment-statement'],
	['ppf-statement', 'investment-statement'],
]

function normalizePath(value: string | null | undefined): string {
	return (value ?? '').trim()
}

function isFinanceDocumentType(
	value: string | null | undefined,
): value is FinanceDocumentType {
	return (
		typeof value === 'string' &&
		FINANCE_DOCUMENT_TYPES.includes(value as FinanceDocumentType)
	)
}

function normalizeLegacyType(
	value: string | null | undefined,
): FinanceDocumentType | null {
	if (!value) {
		return null
	}

	if (value === 'financial-other' || value === 'tax-return') {
		return value === 'tax-return' ? 'tax-record' : 'other'
	}

	return isFinanceDocumentType(value) ? value : null
}

function readStoredClassification(
	metadata: Record<string, unknown> | null | undefined,
): FinanceDocumentClassification | null {
	const stored = metadata?.financeClassification
	if (!stored || typeof stored !== 'object') {
		return null
	}

	const candidate = stored as Partial<FinanceDocumentClassification>
	if (!isFinanceDocumentType(candidate.type)) {
		return null
	}

	if (
		candidate.confidence !== 'high' &&
		candidate.confidence !== 'medium' &&
		candidate.confidence !== 'low'
	) {
		return null
	}

	return {
		type: candidate.type,
		confidence: candidate.confidence,
		source: candidate.source ?? 'metadata',
	}
}

function scoreSignals(signals: SignalMatch[]): {
	type: FinanceDocumentType
	confidence: FinanceClassificationConfidence
	source: FinanceClassificationSource
} | null {
	const scores = new Map<
		FinanceDocumentType,
		{ score: number; channels: Set<SignalMatch['channel']> }
	>()

	for (const signal of signals) {
		const weight =
			signal.channel === 'content'
				? signal.strength === 'strong'
					? 5
					: signal.strength === 'moderate'
						? 4
						: 3
				: signal.strength === 'strong'
					? 3
					: signal.strength === 'moderate'
						? 2
						: 1
		const entry = scores.get(signal.type) ?? { score: 0, channels: new Set() }
		entry.score += weight
		entry.channels.add(signal.channel)
		scores.set(signal.type, entry)
	}

	const ranked = [...scores.entries()].sort(
		(left, right) => right[1].score - left[1].score,
	)
	if (ranked.length === 0) {
		return null
	}

	const [bestType, bestEntry] = ranked[0]!
	const runnerUp = ranked[1]

	if (runnerUp && runnerUp[1].score === bestEntry.score) {
		return null
	}

	const hasFilename = bestEntry.channels.has('filename')
	const hasFolder = bestEntry.channels.has('folder')
	const hasStrongFilename = signals.some(
		(signal) =>
			signal.type === bestType &&
			signal.channel === 'filename' &&
			signal.strength === 'strong',
	)
	const hasStrongFolder = signals.some(
		(signal) =>
			signal.type === bestType &&
			signal.channel === 'folder' &&
			signal.strength === 'strong',
	)

	const filenameType = signals.find(
		(signal) => signal.channel === 'filename' && signal.strength === 'strong',
	)?.type
	const folderType = signals.find(
		(signal) => signal.channel === 'folder' && signal.strength === 'strong',
	)?.type

	if (
		filenameType &&
		folderType &&
		filenameType !== folderType &&
		CONTRADICTION_PAIRS.some(
			([left, right]) =>
				(left === filenameType && right === folderType) ||
				(left === folderType && right === filenameType),
		)
	) {
		return {
			type: filenameType,
			confidence: 'medium',
			source: 'filename',
		}
	}

	let confidence: FinanceClassificationConfidence = 'low'
	let source: FinanceClassificationSource = 'filename'

	if (hasStrongFilename && hasFolder && filenameType === bestType) {
		confidence = 'high'
		source = 'folder+filename'
	} else if (hasStrongFilename) {
		confidence = 'high'
		source = 'filename'
	} else if (hasFilename && hasFolder && filenameType === bestType) {
		confidence = 'medium'
		source = 'folder+filename'
	} else if (hasStrongFolder && !hasFilename) {
		confidence = 'medium'
		source = 'folder'
	} else if (hasFolder) {
		confidence = 'medium'
		source = 'folder'
	} else if (hasFilename) {
		confidence = 'medium'
		source = 'filename'
	}

	if (bestEntry.score < 2) {
		confidence = 'low'
	}

	return { type: bestType, confidence, source }
}

function collectFilenameSignals(fileName: string): SignalMatch[] {
	const signals: SignalMatch[] = []

	for (const rule of FILENAME_RULES) {
		if (rule.strong.some((pattern) => pattern.test(fileName))) {
			signals.push({
				type: rule.type,
				strength: 'strong',
				channel: 'filename',
			})
		} else if (rule.moderate.some((pattern) => pattern.test(fileName))) {
			signals.push({
				type: rule.type,
				strength: 'moderate',
				channel: 'filename',
			})
		}
	}

	return signals
}

function collectFolderSignals(folderPath: string): SignalMatch[] {
	const signals: SignalMatch[] = []

	for (const rule of FOLDER_RULES) {
		if (rule.patterns.some((pattern) => pattern.test(folderPath))) {
			signals.push({
				type: rule.type,
				strength: 'moderate',
				channel: 'folder',
			})
		}
	}

	return signals
}

function collectContentSignals(text: string): SignalMatch[] {
	const trimmed = text.trim()
	if (!trimmed) {
		return []
	}

	const snippet = trimmed.slice(0, 2000)
	return collectFilenameSignals(snippet).map((signal) => ({
		...signal,
		channel: 'content' as const,
		strength: signal.strength === 'strong' ? 'moderate' : 'weak',
	}))
}

export function classifyFinanceDocument(input: {
	fileName: string
	folderPath?: string | null
	mimeType?: string | null
	subCategoryId?: string | null
	extractedMetadata?: Record<string, unknown> | null
	extractedText?: string | null
	aiDocumentType?: FinanceDocumentType | null
	aiConfidence?: number
}): FinanceDocumentClassification {
	if (
		input.aiDocumentType &&
		input.aiDocumentType !== 'other' &&
		(input.aiConfidence ?? 0) >= 0.45
	) {
		const resolved = resolveFinanceDocumentClassification({
			aiDocumentType: input.aiDocumentType,
			aiConfidence: input.aiConfidence,
			fileName: input.fileName,
			folderPath: input.folderPath,
			extractedText: input.extractedText,
		})

		return {
			type: resolved.documentType,
			confidence:
				resolved.confidence >= 0.75
					? 'high'
					: resolved.confidence >= 0.55
						? 'medium'
						: 'low',
			source:
				resolved.source === 'CONTENT_AI' || resolved.source === 'CONTENT_PARSER'
					? 'content'
					: resolved.source === 'FOLDER'
						? 'folder'
						: 'filename',
		}
	}

	const stored = readStoredClassification(input.extractedMetadata)
	if (stored && stored.confidence !== 'low') {
		return { ...stored, source: 'metadata' }
	}

	const legacyType = normalizeLegacyType(input.subCategoryId)
	const fileName = input.fileName.trim()
	const folderPath = normalizePath(input.folderPath)
	const signals: SignalMatch[] = []

	if (legacyType && legacyType !== 'other') {
		signals.push({
			type: legacyType,
			strength: 'moderate',
			channel: 'existing',
		})
	}

	signals.push(...collectFilenameSignals(fileName))

	if (folderPath) {
		signals.push(...collectFolderSignals(folderPath))
	}

	if (input.extractedText?.trim()) {
		signals.push(...collectContentSignals(input.extractedText))
	}

	const resolved = scoreSignals(signals)

	if (!resolved || resolved.confidence === 'low') {
		return {
			type: 'other',
			confidence: 'low',
			source: resolved?.source ?? 'filename',
		}
	}

	return resolved
}

export function getFinanceDocumentTypeLabel(
	type: FinanceDocumentType | string | null,
): string {
	if (!type) {
		return TYPE_LABELS.other
	}

	return TYPE_LABELS[type as FinanceDocumentType] ?? TYPE_LABELS.other
}

/** @deprecated Use getFinanceDocumentTypeLabel */
export function getFinanceSubCategoryLabel(
	type: FinanceDocumentType | string | null,
): string {
	return getFinanceDocumentTypeLabel(type)
}

/** @deprecated Use classifyFinanceDocument */
export function resolveFinanceSubCategoryId(input: {
	fileName: string
	folderPath?: string | null
	subCategoryId?: string | null
	extractedMetadata?: Record<string, unknown> | null
	extractedText?: string | null
}): FinanceDocumentType {
	return classifyFinanceDocument(input).type
}

export function isFinanceFolderPath(
	folderPath: string | null | undefined,
): boolean {
	const normalized = normalizePath(folderPath).toLowerCase()

	if (!normalized) {
		return false
	}

	return (
		normalized === 'finance' ||
		normalized.startsWith('finance/') ||
		/\b(bank|investments?|loans?|credit cards?|tax|nps|epf|ppf|salary|insurance)\b/i.test(
			normalized,
		)
	)
}

export function readFinanceClassificationFromMetadata(
	metadata: Record<string, unknown> | null | undefined,
): FinanceDocumentClassification | null {
	return readStoredClassification(metadata)
}

export function isFinanceDocumentOrganizing(
	classification: FinanceDocumentClassification,
): boolean {
	return classification.type === 'other' || classification.confidence === 'low'
}
