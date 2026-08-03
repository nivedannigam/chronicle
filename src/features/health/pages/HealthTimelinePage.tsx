import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'

/** @deprecated Timeline was renamed to History */
export function HealthTimelinePage() {
	return <Navigate to={ROUTES.healthHistory} replace />
}
