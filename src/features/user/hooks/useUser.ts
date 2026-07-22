import { useAuth } from '@/features/auth/hooks/useAuth'

export function useUser() {
	const { user, profile, isLoading } = useAuth()

	return { user, profile, isLoading }
}
