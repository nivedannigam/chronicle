export function buildInsuranceExtractionPrompt(input: {
	fileName: string
	folderPath?: string | null
	extractedText: string
}): Array<{ role: string; content: string }> {
	return [
		{
			role: 'system',
			content: `You extract structured insurance policy data from document text.
Return ONLY valid JSON with this shape:
{
  "insurer": string | null,
  "policyNumber": string | null,
  "policyType": "health" | "life_term" | "motor" | "home" | "travel" | "other" | null,
  "productName": string | null,
  "inceptionDate": "YYYY-MM-DD" | null,
  "expiryDate": "YYYY-MM-DD" | null,
  "renewalDate": "YYYY-MM-DD" | null,
  "sumInsured": number | null,
  "premium": number | null,
  "currency": "INR" | null,
  "insuredMembers": string[],
  "documentKind": "policy_schedule" | "renewal_notice" | "premium_receipt" | "claim_letter" | "unknown" | null,
  "confidence": number
}
Use null when unknown. Dates must be ISO YYYY-MM-DD. Do not invent values.`,
		},
		{
			role: 'user',
			content: `File: ${input.fileName}
Folder: ${input.folderPath ?? 'unknown'}

Document text:
${input.extractedText.slice(0, 120_000)}`,
		},
	]
}

export function buildInsuranceDirectExtractionPrompt(input: {
	fileName: string
	folderPath?: string | null
	categoryHint?: string | null
}): Array<{ role: string; content: string }> {
	return [
		{
			role: 'system',
			content: `You extract structured insurance policy data from the attached document.
Return ONLY valid JSON with this shape:
{
  "insurer": string | null,
  "policyNumber": string | null,
  "policyType": "health" | "life_term" | "motor" | "home" | "travel" | "other" | null,
  "productName": string | null,
  "inceptionDate": "YYYY-MM-DD" | null,
  "expiryDate": "YYYY-MM-DD" | null,
  "renewalDate": "YYYY-MM-DD" | null,
  "sumInsured": number | null,
  "premium": number | null,
  "currency": "INR" | null,
  "insuredMembers": string[],
  "documentKind": "policy_schedule" | "renewal_notice" | "premium_receipt" | "claim_letter" | "unknown" | null,
  "confidence": number
}
Use null when unknown. Dates must be ISO YYYY-MM-DD. Do not invent values.`,
		},
		{
			role: 'user',
			content: `Read the attached insurance document and extract structured policy data.

File: ${input.fileName}
Folder: ${input.folderPath ?? 'unknown'}
Category hint: ${input.categoryHint ?? 'unknown'}`,
		},
	]
}

export function buildVehicleExtractionPrompt(input: {
	fileName: string
	folderPath?: string | null
	extractedText: string
}): Array<{ role: string; content: string }> {
	return [
		{
			role: 'system',
			content: `You extract structured vehicle document data from Indian vehicle documents.
Return ONLY valid JSON with this shape:
{
  "documentType": "registration" | "insurance" | "compliance" | "service" | "warranty" | "purchase_finance" | "other" | null,
  "documentSubtype": string | null,
  "registrationNumber": string | null,
  "vin": string | null,
  "engineNumber": string | null,
  "make": string | null,
  "model": string | null,
  "variant": string | null,
  "documentDate": "YYYY-MM-DD" | null,
  "expiryDate": "YYYY-MM-DD" | null,
  "provider": string | null,
  "facts": [
    { "factKey": string, "factValue": string | null, "valueDate": "YYYY-MM-DD" | null, "valueNumber": number | null }
  ],
  "confidence": number
}
Include facts such as policy_number, policy_expiry, puc_expiry, service_date, service_mileage, premium, idv when present.
Use null when unknown. Do not invent values.`,
		},
		{
			role: 'user',
			content: `File: ${input.fileName}
Folder: ${input.folderPath ?? 'unknown'}

Document text:
${input.extractedText.slice(0, 120_000)}`,
		},
	]
}

export function buildVehicleDirectExtractionPrompt(input: {
	fileName: string
	folderPath?: string | null
}): Array<{ role: string; content: string }> {
	return [
		{
			role: 'system',
			content: `You extract structured vehicle document data from Indian vehicle documents.
Return ONLY valid JSON with this shape:
{
  "documentType": "registration" | "insurance" | "compliance" | "service" | "warranty" | "purchase_finance" | "other" | null,
  "documentSubtype": string | null,
  "registrationNumber": string | null,
  "vin": string | null,
  "engineNumber": string | null,
  "make": string | null,
  "model": string | null,
  "variant": string | null,
  "documentDate": "YYYY-MM-DD" | null,
  "expiryDate": "YYYY-MM-DD" | null,
  "provider": string | null,
  "facts": [
    { "factKey": string, "factValue": string | null, "valueDate": "YYYY-MM-DD" | null, "valueNumber": number | null }
  ],
  "confidence": number
}
Include facts such as policy_number, policy_expiry, puc_expiry, service_date, service_mileage, premium, idv when present.
Use null when unknown. Do not invent values.`,
		},
		{
			role: 'user',
			content: `Read the attached vehicle document and extract structured data.

File: ${input.fileName}
Folder: ${input.folderPath ?? 'unknown'}`,
		},
	]
}
