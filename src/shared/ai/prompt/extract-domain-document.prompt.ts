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

const FINANCE_EXTRACTION_JSON_SHAPE = `{
  "documentType": "bank-statement" | "credit-card-statement" | "loan-statement" | "investment-statement",
  "institution": string | null,
  "accountType": string | null,
  "cardName": string | null,
  "loanType": string | null,
  "investmentType": string | null,
  "maskedAccountIdentifier": string | null,
  "accountHolder": string | null,
  "jointHolder": string | null,
  "statementDate": "YYYY-MM-DD" | null,
  "statementPeriodStart": "YYYY-MM-DD" | null,
  "statementPeriodEnd": "YYYY-MM-DD" | null,
  "currency": "INR" | null,
  "openingBalance": number | null,
  "closingBalance": number | null,
  "totalAmountDue": number | null,
  "minimumAmountDue": number | null,
  "paymentDueDate": "YYYY-MM-DD" | null,
  "creditLimit": number | null,
  "availableCredit": number | null,
  "outstandingPrincipal": number | null,
  "originalLoanAmount": number | null,
  "interestRate": number | null,
  "emi": number | null,
  "nextPaymentDate": "YYYY-MM-DD" | null,
  "loanStartDate": "YYYY-MM-DD" | null,
  "loanEndDate": "YYYY-MM-DD" | null,
  "folioNumber": string | null,
  "schemeName": string | null,
  "units": number | null,
  "nav": number | null,
  "marketValue": number | null,
  "investedValue": number | null,
  "confidence": number
}`

export function buildFinanceExtractionPrompt(input: {
	fileName: string
	folderPath?: string | null
	documentType: string
	extractedText: string
}): Array<{ role: string; content: string }> {
	return [
		{
			role: 'system',
			content: `You extract structured financial statement data from Indian financial documents.
Return ONLY valid JSON with this shape:
${FINANCE_EXTRACTION_JSON_SHAPE}
Rules:
- Extract ONLY values explicitly present in the document.
- Use null when unknown. Do not infer net worth, spending categories, or portfolio totals.
- Mask account/card identifiers — return only last 4 digits if full number appears.
- Dates must be ISO YYYY-MM-DD.
- currency should be INR unless clearly otherwise.
- confidence is 0..1 based on extraction certainty.`,
		},
		{
			role: 'user',
			content: `Document type hint: ${input.documentType}
File: ${input.fileName}
Folder: ${input.folderPath ?? 'unknown'}

Document text:
${input.extractedText.slice(0, 120_000)}`,
		},
	]
}

export function buildFinanceDirectExtractionPrompt(input: {
	fileName: string
	folderPath?: string | null
	documentType: string
}): Array<{ role: string; content: string }> {
	return [
		{
			role: 'system',
			content: `You extract structured financial statement data from the attached Indian financial document.
Return ONLY valid JSON with this shape:
${FINANCE_EXTRACTION_JSON_SHAPE}
Rules:
- Extract ONLY values explicitly present in the document.
- Use null when unknown. Do not invent balances or totals.
- Mask account/card identifiers — return only last 4 digits if full number appears.
- Dates must be ISO YYYY-MM-DD.`,
		},
		{
			role: 'user',
			content: `Read the attached financial document.

Document type hint: ${input.documentType}
File: ${input.fileName}
Folder: ${input.folderPath ?? 'unknown'}`,
		},
	]
}
