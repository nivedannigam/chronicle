import { useContext } from 'react'
import { PropertyContext } from '@/features/property/context/property-context'

export function usePropertyContext() {
	const context = useContext(PropertyContext)

	if (!context) {
		throw new Error('usePropertyContext must be used within PropertyProvider')
	}

	return context
}
