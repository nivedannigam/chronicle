import { createContext } from 'react'
import type { FinanceContextValue } from '@/features/finance/services/finance-context.builder'

export const FinanceContext = createContext<FinanceContextValue | null>(null)
