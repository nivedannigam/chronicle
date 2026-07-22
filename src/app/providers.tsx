import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/components/AuthProvider'
import { AppRouter } from '@/app/router'
import { queryClient } from '@/lib/query-client'

export function AppProviders() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<AuthProvider>
					<AppRouter />
				</AuthProvider>
			</BrowserRouter>
		</QueryClientProvider>
	)
}
