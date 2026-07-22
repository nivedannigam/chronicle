import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage, ProtectedRoute, PublicRoute } from '@/features/auth'
import { AskPage } from '@/features/ask'
import {
	HealthComparePage,
	HealthDashboardPage,
	HealthLayout,
	HealthReportDetailPage,
	HealthReportsPage,
	HealthTrendsPage,
} from '@/features/health'
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

					<Route path={ROUTES.health} element={<HealthLayout />}>
						<Route index element={<HealthDashboardPage />} />
						<Route path="reports" element={<HealthReportsPage />} />
						<Route path="trends" element={<HealthTrendsPage />} />
					</Route>
					<Route
						path={ROUTES.healthReport}
						element={<HealthReportDetailPage />}
					/>
					<Route path={ROUTES.healthCompare} element={<HealthComparePage />} />
				</Route>
			</Route>

			<Route path="*" element={<NotFoundPage />} />
		</Routes>
	)
}
