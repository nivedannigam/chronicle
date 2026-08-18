import { useContext } from 'react'
import type { IdentityContextValue } from '@/features/identity/services/identity-context.builder'
import { IdentityContext } from '@/features/identity/context/identity-context'

export function useIdentityContext(): IdentityContextValue {
	const context = useContext(IdentityContext)

	if (!context) {
		throw new Error('useIdentityContext must be used within IdentityProvider')
	}

	return context
}
