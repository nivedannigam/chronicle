import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage, ProtectedRoute, PublicRoute } from '@/features/auth'
import { AskPage } from '@/features/ask'
import {
	ConnectorDebugPage,
	GoogleDriveConnectorPage,
} from '@/features/connectors'
import '@/features/connectors/services/connector-bootstrap'
import {
	HealthComparePage,
	HealthDashboardPage,
	HealthLayout,
	HealthReportDetailPage,
	HealthReportsPage,
	HealthTrendsPage,
} from '@/features/health'
import {
	HealthKnowledgeDebugPage,
	HealthMetricTimelinePage,
} from '@/features/health-knowledge'
import {
	HealthImportWizardPage,
	ImportCenterPage,
	ImportDebugPage,
} from '@/features/health-import'
import {
	DiscoveryDashboardPage,
	ImportReviewPage,
	OcrPreviewPage,
} from '@/features/medical-discovery'
import { HealthValidationPage } from '@/features/health-validation'
import { HomePage } from '@/features/home'
import { MailPage } from '@/features/mail'
import { HealthSourcesPage } from '@/features/family'
import { MorePage } from '@/features/more'
import {
	SettingsAccountPage,
	SettingsDataPage,
	ProfilePage,
} from '@/features/settings'
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
					<Route path={ROUTES.healthSources} element={<HealthSourcesPage />} />
					<Route
						path={ROUTES.settingsHealthSources}
						element={<HealthSourcesPage />}
					/>
					<Route path={ROUTES.profile} element={<ProfilePage />} />
					<Route
						path={ROUTES.settingsAccount}
						element={<SettingsAccountPage />}
					/>
					<Route path={ROUTES.settingsData} element={<SettingsDataPage />} />
					<Route
						path={ROUTES.settingsConnectorsDrive}
						element={<GoogleDriveConnectorPage />}
					/>
					<Route path={ROUTES.settingsImport} element={<ImportCenterPage />} />
					<Route
						path={ROUTES.connectorsGoogleDrive}
						element={<Navigate to={ROUTES.settingsConnectorsDrive} replace />}
					/>
					<Route
						path={ROUTES.healthImport}
						element={<Navigate to={ROUTES.settingsImport} replace />}
					/>
					<Route
						path={ROUTES.healthImportWizard}
						element={<HealthImportWizardPage />}
					/>
					<Route
						path={ROUTES.healthDiscovery}
						element={<DiscoveryDashboardPage />}
					/>
					<Route
						path={ROUTES.healthImportReview}
						element={<ImportReviewPage />}
					/>

					<Route path={ROUTES.health} element={<HealthLayout />}>
						<Route index element={<HealthDashboardPage />} />
						<Route path="reports" element={<HealthReportsPage />} />
						<Route path="trends" element={<HealthTrendsPage />} />
					</Route>
					<Route
						path={ROUTES.healthReport}
						element={<HealthReportDetailPage />}
					/>
					<Route path={ROUTES.healthOcrPreview} element={<OcrPreviewPage />} />
					<Route
						path={ROUTES.healthValidation}
						element={<HealthValidationPage />}
					/>
					<Route path={ROUTES.healthCompare} element={<HealthComparePage />} />
					<Route
						path={ROUTES.healthMetric}
						element={<HealthMetricTimelinePage />}
					/>

					{import.meta.env.DEV ? (
						<>
							<Route
								path={ROUTES.connectorsDebug}
								element={<ConnectorDebugPage />}
							/>
							<Route
								path={ROUTES.healthImportDebug}
								element={<ImportDebugPage />}
							/>
							<Route
								path={ROUTES.healthKnowledgeDebug}
								element={<HealthKnowledgeDebugPage />}
							/>
						</>
					) : null}
				</Route>
			</Route>

			<Route path="*" element={<NotFoundPage />} />
		</Routes>
	)
}
