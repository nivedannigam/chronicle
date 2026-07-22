import { Navigate, Outlet } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { AuthLoadingScreen } from '@/features/auth/components/AuthLoadingScreen'

export function ProtectedRoute() {
	const { session, isLoading } = useAuth()

	if (isLoading) {
		return <AuthLoadingScreen />
	}

	if (!session) {
		return <Navigate to={ROUTES.login} replace />
	}

	return <Outlet />
}
