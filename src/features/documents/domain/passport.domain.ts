export interface PassportDocument {
	id: string
	documentId: string
	documentNumber: string | null
	holderName: string | null
	nationality: string | null
	issueDate: string | null
	expiryDate: string | null
	issuer: string | null
	mrzLine1: string | null
	mrzLine2: string | null
	extractedText: string
	parserVersion: string
	createdAt: string
}
