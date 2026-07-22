import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage, ProtectedRoute, PublicRoute } from '@/features/auth'
import { AskPage } from '@/features/ask'
import { HealthHomePage, HealthReportDetailPage } from '@/features/health'
import { HomePage } from '@/features/home'
import { MailPage } from '@/features/mail'
import { MorePage } from '@/features/more'
import { TasksPage } from '@/features/tasks'
import { AppLayout } from '@/components/layout/AppLayout'
import { DEFAULT_AUTHENTICATED_ROUTE, ROUTES } from '@/constants/routes'
import { NotFoundPage } from '@/pages/NotFound/NotFoundPage'

export function AppRouter() {
	return (
		<Routes>
			<Route
				path={ROUTES.root}
				element={<Navigate to={DEFAULT_AUTHENTICATED_ROUTE} replace />}
			/>

			<Route element={<PublicRoute />}>
				<Route path={ROUTES.login} element={<LoginPage />} />
			</Route>

			<Route element={<ProtectedRoute />}>
				<Route element={<AppLayout />}>
					<Route path={ROUTES.home} element={<HomePage />} />
					<Route path={ROUTES.ask} element={<AskPage />} />
					<Route path={ROUTES.mail} element={<MailPage />} />
					<Route path={ROUTES.tasks} element={<TasksPage />} />
					<Route path={ROUTES.more} element={<MorePage />} />
					<Route path={ROUTES.health} element={<HealthHomePage />} />
					<Route
						path={ROUTES.healthReport}
						element={<HealthReportDetailPage />}
					/>
				</Route>
			</Route>

			<Route path="*" element={<NotFoundPage />} />
		</Routes>
	)
}
