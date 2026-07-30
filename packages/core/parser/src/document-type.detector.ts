import type { DocumentTypeId, ParserInput } from './parser.types.ts'

const HEALTH_KEYWORDS =
	/\b(hemoglobin|glucose|cholesterol|laboratory|pathology|lab report|blood test|lipid profile|liver function|kidney function|vitamin|hba1c|tsh|creatinine)\b/i

const PASSPORT_KEYWORDS =
	/\b(passport|republic of|nationality|date of birth|mrz|travel document)\b/i

export function detectDocumentType(input: ParserInput): DocumentTypeId {
	const text = [input.fileName, input.ocrDocument.rawText.slice(0, 4000)].join(
		'\n',
	)

	if (PASSPORT_KEYWORDS.test(text)) {
		return 'passport'
	}

	if (
		HEALTH_KEYWORDS.test(text) ||
		input.fileName.toLowerCase().includes('lab')
	) {
		return 'health_report'
	}

	return 'unknown'
}

export function documentTypeLabel(documentType: DocumentTypeId): string {
	switch (documentType) {
		case 'health_report':
			return 'Health Report'
		case 'passport':
			return 'Passport'
		case 'insurance_policy':
			return 'Insurance Policy'
		case 'tax_form':
			return 'Tax Form'
		case 'invoice':
			return 'Invoice'
		case 'property_deed':
			return 'Property Deed'
		default:
			return 'Unknown Document'
	}
}
