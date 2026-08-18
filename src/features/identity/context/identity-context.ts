import { createContext } from 'react'
import type { IdentityContextValue } from '@/features/identity/services/identity-context.builder'

export const IdentityContext = createContext<IdentityContextValue | null>(null)
