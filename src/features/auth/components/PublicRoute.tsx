import { Navigate, Outlet } from 'react-router-dom'
import { DEFAULT_AUTHENTICATED_ROUTE } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AuthLoadingScreen } from '@/features/auth/components/AuthLoadingScreen'

export function PublicRoute() {
	const { session, isLoading } = useAuth()

	if (isLoading) {
		return <AuthLoadingScreen />
	}

	if (session) {
		return <Navigate to={DEFAULT_AUTHENTICATED_ROUTE} replace />
	}

	return <Outlet />
}
