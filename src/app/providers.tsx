import { QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/features/auth/components/AuthProvider'
import { FamilyProvider } from '@/features/family/context/FamilyContext'
import { AppRouter } from '@/app/router'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { queryClient } from '@/lib/query-client'

export function AppProviders() {
	return (
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<ErrorBoundary>
					<AuthProvider>
						<FamilyProvider>
							<AppRouter />
						</FamilyProvider>
					</AuthProvider>
				</ErrorBoundary>
			</BrowserRouter>
		</QueryClientProvider>
	)
}
