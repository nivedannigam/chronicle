import { Navigate, useLocation } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

/**
 * Redirects legacy module Ask routes to the universal Ask experience
 * while preserving query parameters and adding module context.
 */
export function ModuleAskRedirect({
	context,
}: {
	context: 'health' | 'insurance' | 'vehicles'
}) {
	const location = useLocation()
	const params = new URLSearchParams(location.search)
	params.set('context', context)

	return <Navigate to={`${ROUTES.ask}?${params.toString()}`} replace />
}
