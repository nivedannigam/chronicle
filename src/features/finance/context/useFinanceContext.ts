import { useContext } from 'react'
import type { FinanceContextValue } from '@/features/finance/services/finance-context.builder'
import { FinanceContext } from '@/features/finance/context/finance-context'

export function useFinanceContext(): FinanceContextValue {
	const context = useContext(FinanceContext)

	if (!context) {
		throw new Error('useFinanceContext must be used within FinanceProvider')
	}

	return context
}
