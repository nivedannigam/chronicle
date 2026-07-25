export interface DocumentFieldDefinition {
	id: string
	label: string
	patterns: RegExp[]
	normalize?: (value: string) => string
}

/** Field definitions are shared across categories — not hardcoded per document type. */
export const DOCUMENT_FIELD_DEFINITIONS: DocumentFieldDefinition[] = [
	{
		id: 'document_number',
		label: 'Document Number',
		patterns: [
			/(?:passport\s*(?:no|number|#)?[:\s]*)([A-Z0-9]{6,12})/i,
			/(?:pan[:\s]*)([A-Z]{5}\d{4}[A-Z])/i,
			/(?:aadhaar[:\s]*)(\d{4}\s?\d{4}\s?\d{4})/i,
			/(?:licen[cs]e\s*(?:no|number|#)?[:\s]*)([A-Z0-9/-]{5,20})/i,
			/(?:policy\s*(?:no|number|#)?[:\s]*)([A-Z0-9/-]{4,24})/i,
		],
	},
	{
		id: 'issue_date',
		label: 'Issue Date',
		patterns: [
			/(?:issue(?:d)?\s*(?:on|date)?[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
			/(?:date of issue[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
		],
	},
	{
		id: 'expiry_date',
		label: 'Expiry Date',
		patterns: [
			/(?:expir(?:y|es|ation)\s*(?:on|date)?[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
			/(?:valid\s*(?:till|until|upto|up to)[:\s]*)(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
		],
	},
	{
		id: 'issuer',
		label: 'Issuer',
		patterns: [
			/(?:issued by[:\s]*)([A-Za-z0-9\s,.-]{3,80})/i,
			/(?:authority[:\s]*)([A-Za-z0-9\s,.-]{3,80})/i,
		],
	},
	{
		id: 'holder_name',
		label: 'Name',
		patterns: [
			/(?:name[:\s]*)([A-Za-z\s.]{3,80})/i,
			/(?:holder[:\s]*)([A-Za-z\s.]{3,80})/i,
		],
	},
	{
		id: 'address',
		label: 'Address',
		patterns: [/(?:address[:\s]*)(.{10,200})/i],
	},
]

export function getFieldDefinition(
	fieldId: string,
): DocumentFieldDefinition | undefined {
	return DOCUMENT_FIELD_DEFINITIONS.find((field) => field.id === fieldId)
}
