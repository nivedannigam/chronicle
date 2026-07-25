import { DOCUMENT_FIELD_DEFINITIONS } from '@/features/documents/extraction/document-field-definitions'
import { inferDocumentCategory } from '@/features/documents/types/document-categories'

function parseDate(value: string): string | null {
	const cleaned = value.trim().replace(/\./g, '/')
	const parts = cleaned.split(/[/-]/)

	if (parts.length !== 3) {
		return null
	}

	const [day, month, yearRaw] = parts
	const year =
		yearRaw.length === 2
			? `20${yearRaw}`
			: yearRaw.length === 4
				? yearRaw
				: null

	if (!year || !month || !day) {
		return null
	}

	const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
	const parsed = Date.parse(iso)

	return Number.isNaN(parsed) ? null : iso
}

export interface ExtractedDocumentMetadata {
	categoryId: string
	subCategoryId: string | null
	documentNumber: string | null
	issueDate: string | null
	expiryDate: string | null
	issuer: string | null
	holderName: string | null
	address: string | null
	fields: Record<string, string>
	confidence: number
}

export function extractDocumentMetadata(input: {
	fileName: string
	text?: string | null
	categoryHint?: string
}): ExtractedDocumentMetadata {
	const inferred = inferDocumentCategory({
		fileName: input.fileName,
		text: input.text,
	})
	const categoryId = input.categoryHint ?? inferred.categoryId
	const subCategoryId = inferred.subCategoryId
	const sourceText = `${input.fileName}\n${input.text ?? ''}`
	const fields: Record<string, string> = {}

	for (const definition of DOCUMENT_FIELD_DEFINITIONS) {
		for (const pattern of definition.patterns) {
			const match = sourceText.match(pattern)

			if (match?.[1]) {
				const raw = match[1].trim()
				fields[definition.id] = definition.normalize?.(raw) ?? raw
				break
			}
		}
	}

	const populatedCount = Object.keys(fields).length
	const confidence = Math.min(0.95, 0.35 + populatedCount * 0.12)

	return {
		categoryId,
		subCategoryId,
		documentNumber: fields.document_number ?? null,
		issueDate: fields.issue_date ? parseDate(fields.issue_date) : null,
		expiryDate: fields.expiry_date ? parseDate(fields.expiry_date) : null,
		issuer: fields.issuer ?? null,
		holderName: fields.holder_name ?? null,
		address: fields.address ?? null,
		fields,
		confidence,
	}
}

export function buildDocumentTitle(input: {
	fileName: string
	categoryId: string
	subCategoryId?: string | null
	documentNumber?: string | null
}): string {
	const baseName = input.fileName.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')

	if (input.documentNumber) {
		return `${baseName} (${input.documentNumber})`
	}

	return baseName
}
