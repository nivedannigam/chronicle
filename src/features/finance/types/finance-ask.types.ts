export interface FinanceAskScope {
	entityId?: string
	documentId?: string
	entityKind?: 'bank_account' | 'credit_card' | 'loan' | 'investment_account'
}
