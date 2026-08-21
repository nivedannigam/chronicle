import { createContext } from 'react'
import type { PropertyContextValue } from '@/features/property/services/property-context.builder'

export const PropertyContext = createContext<PropertyContextValue | null>(null)
