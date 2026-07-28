import { Navigate, Route, Routes } from 'react-router-dom'
import {
	LoginPage,
	ProtectedRoute,
	PublicRoute,
	AuthCallbackPage,
} from '@/features/auth'
import { AskPage } from '@/features/ask'
import { ConnectorDebugPage } from '@/features/connectors'
import '@/features/connectors/services/connector-bootstrap'
import {
	HealthComparePage,
	HealthDashboardPage,
	HealthInsightsPage,
	HealthLayout,
	HealthMetricsPage,
	HealthReportDetailPage,
	HealthReportsPage,
	HealthSettingsPage,
	HealthTimelinePage,
} from '@/features/health'
import { HealthMetricTimelinePage } from '@/features/health-knowledge'
import { ImportReviewPage, OcrPreviewPage } from '@/features/medical-discovery'
import { HomePage } from '@/features/home'
import { MailPage } from '@/features/mail'
import {
	FamilyMemberDetailPage,
	FamilyMemberFormPage,
	FamilyOverviewPage,
} from '@/features/family'
import { MorePage } from '@/features/more'
import {
	SettingsAccountPage,
	SettingsAppearancePage,
	SettingsNotificationsPage,
	ProfilePage,
	ProfileConnectionsPage,
	ProfileDrivePage,
	ProfileSecurityPage,
	PreferencesPage,
} from '@/features/settings'
import { TasksPage } from '@/features/tasks'
import {
	DocumentDetailPage,
	DocumentsExpiringPage,
	DocumentsLayout,
	DocumentsPage,
} from '@/features/documents'
import { DocumentsCategoryPage } from '@/features/documents/pages/DocumentsCategoryPage'
import { TimelinePage } from '@/features/timeline'
import { SearchPage } from '@/features/search'
import { AppLayout } from '@/components/layout/AppLayout'
import { DEFAULT_AUTHENTICATED_ROUTE, ROUTES } from '@/constants/routes'
import { FigmaNotFoundScreen } from '@/ui/figma/screens/FigmaNotFoundScreen'

export function AppRouter() {
	const isDev = import.meta.env.DEV

	return (
		<Routes>
			<Route
				path={ROUTES.root}
				element={<Navigate to={DEFAULT_AUTHENTICATED_ROUTE} replace />}
			/>

			<Route element={<PublicRoute />}>
				<Route path={ROUTES.login} element={<LoginPage />} />
				<Route path={ROUTES.authCallback} element={<AuthCallbackPage />} />
			</Route>

			<Route element={<ProtectedRoute />}>
				<Route element={<AppLayout />}>
					<Route path={ROUTES.home} element={<HomePage />} />
					<Route
						path={ROUTES.homeActivity}
						element={<Navigate to={ROUTES.timeline} replace />}
					/>
					<Route path={ROUTES.timeline} element={<TimelinePage />} />
					<Route
						path={ROUTES.family}
						element={<Navigate to={ROUTES.profileFamily} replace />}
					/>
					<Route
						path={ROUTES.familyMemberNew}
						element={<FamilyMemberFormPage />}
					/>
					<Route
						path={ROUTES.familyMemberEdit}
						element={<FamilyMemberFormPage />}
					/>
					<Route
						path={ROUTES.familyMember}
						element={<FamilyMemberDetailPage />}
					/>
					<Route
						path={ROUTES.integrations}
						element={<Navigate to={ROUTES.profileConnections} replace />}
					/>
					<Route
						path={ROUTES.settings}
						element={<Navigate to={ROUTES.profile} replace />}
					/>
					<Route
						path={ROUTES.preferences}
						element={<Navigate to={ROUTES.profilePreferences} replace />}
					/>
					<Route
						path={ROUTES.settingsNotifications}
						element={<SettingsNotificationsPage />}
					/>
					<Route
						path={ROUTES.settingsAppearance}
						element={<SettingsAppearancePage />}
					/>
					<Route path={ROUTES.ask} element={<AskPage />} />
					<Route path={ROUTES.search} element={<SearchPage />} />
					<Route path={ROUTES.mail} element={<MailPage />} />
					<Route path={ROUTES.tasks} element={<TasksPage />} />
					<Route path={ROUTES.more} element={<MorePage />} />
					<Route path={ROUTES.documents} element={<DocumentsLayout />}>
						<Route index element={<DocumentsPage />} />
						<Route path="expiring" element={<DocumentsExpiringPage />} />
						<Route
							path="category/:categoryId"
							element={<DocumentsCategoryPage />}
						/>
					</Route>
					<Route
						path={ROUTES.documentDetail}
						element={<DocumentDetailPage />}
					/>
					<Route
						path={ROUTES.healthSources}
						element={<Navigate to={ROUTES.healthSettings} replace />}
					/>
					<Route
						path={ROUTES.settingsHealthSources}
						element={<Navigate to={ROUTES.healthSettings} replace />}
					/>
					<Route path={ROUTES.profile} element={<ProfilePage />} />
					<Route
						path={ROUTES.profilePersonal}
						element={<SettingsAccountPage />}
					/>
					<Route path={ROUTES.profileFamily} element={<FamilyOverviewPage />} />
					<Route
						path={ROUTES.profileConnections}
						element={<ProfileConnectionsPage />}
					/>
					<Route
						path={ROUTES.profileConnectionsDrive}
						element={<ProfileDrivePage />}
					/>
					<Route
						path={ROUTES.profilePreferences}
						element={<PreferencesPage />}
					/>
					<Route
						path={ROUTES.profileSecurity}
						element={<ProfileSecurityPage />}
					/>
					<Route
						path={ROUTES.settingsAccount}
						element={<Navigate to={ROUTES.profilePersonal} replace />}
					/>
					<Route
						path={ROUTES.settingsData}
						element={<Navigate to={ROUTES.profileSecurity} replace />}
					/>
					<Route
						path={ROUTES.settingsConnectorsDrive}
						element={<Navigate to={ROUTES.profileConnectionsDrive} replace />}
					/>
					<Route
						path={ROUTES.settingsImport}
						element={<Navigate to={ROUTES.healthSettings} replace />}
					/>
					<Route
						path={ROUTES.connectorsGoogleDrive}
						element={<Navigate to={ROUTES.profileConnectionsDrive} replace />}
					/>
					<Route
						path={ROUTES.healthImport}
						element={<Navigate to={ROUTES.healthSettings} replace />}
					/>
					<Route
						path={ROUTES.healthTrends}
						element={<Navigate to={ROUTES.healthMetrics} replace />}
					/>
					<Route
						path={ROUTES.healthImportReview}
						element={<ImportReviewPage />}
					/>

					<Route path={ROUTES.health} element={<HealthLayout />}>
						<Route index element={<HealthDashboardPage />} />
						<Route path="reports" element={<HealthReportsPage />} />
						<Route path="timeline" element={<HealthTimelinePage />} />
						<Route path="metrics" element={<HealthMetricsPage />} />
						<Route path="insights" element={<HealthInsightsPage />} />
						<Route path="settings" element={<HealthSettingsPage />} />
					</Route>

					<Route
						path={ROUTES.healthReport}
						element={<HealthReportDetailPage />}
					/>
					<Route
						path={ROUTES.healthOcrPreview}
						element={
							isDev ? (
								<OcrPreviewPage />
							) : (
								<Navigate to={ROUTES.healthReports} replace />
							)
						}
					/>
					<Route
						path={ROUTES.healthMetric}
						element={<HealthMetricTimelinePage />}
					/>

					{isDev ? (
						<>
							<Route
								path={ROUTES.connectorsDebug}
								element={<ConnectorDebugPage />}
							/>
							<Route
								path={ROUTES.healthImportDebug}
								element={<Navigate to={ROUTES.healthSettings} replace />}
							/>
							<Route
								path={ROUTES.healthKnowledgeDebug}
								element={<Navigate to={ROUTES.healthInsights} replace />}
							/>
							<Route
								path={ROUTES.healthValidation}
								element={<Navigate to={ROUTES.health} replace />}
							/>
							<Route
								path={ROUTES.healthDiscovery}
								element={<Navigate to={ROUTES.healthSettings} replace />}
							/>
							<Route
								path={ROUTES.healthImportWizard}
								element={<Navigate to={ROUTES.healthSettings} replace />}
							/>
							<Route
								path={ROUTES.healthCompare}
								element={<HealthComparePage />}
							/>
						</>
					) : (
						<>
							<Route
								path={ROUTES.healthValidation}
								element={<Navigate to={ROUTES.health} replace />}
							/>
							<Route
								path={ROUTES.healthDiscovery}
								element={<Navigate to={ROUTES.healthSettings} replace />}
							/>
							<Route
								path={ROUTES.healthImportWizard}
								element={<Navigate to={ROUTES.healthSettings} replace />}
							/>
							<Route
								path={ROUTES.healthImportDebug}
								element={<Navigate to={ROUTES.healthSettings} replace />}
							/>
							<Route
								path={ROUTES.healthKnowledgeDebug}
								element={<Navigate to={ROUTES.healthInsights} replace />}
							/>
							<Route
								path={ROUTES.healthCompare}
								element={<Navigate to={ROUTES.healthReports} replace />}
							/>
						</>
					)}
					<Route path="*" element={<FigmaNotFoundScreen />} />
				</Route>
			</Route>
		</Routes>
	)
}
