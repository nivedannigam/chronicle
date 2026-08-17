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
	HealthAskPage,
	HealthComparePage,
	HealthHistoryPage,
	HealthHomePage,
	HealthImportCenterPage,
	HealthLayout,
	HealthProgressPage,
	HealthReportDetailPage,
	HealthReportsPage,
	HealthSettingsPage,
	HealthFolderSetupPage,
	HealthVisitDetailPage,
} from '@/features/health'
import { HealthMetricTimelinePage } from '@/features/health-knowledge'
import { OcrPreviewPage } from '@/features/medical-discovery'
import { HomePage } from '@/features/home'
import { NotificationsPage } from '@/features/os/pages/NotificationsPage'
import { MailPage } from '@/features/mail'
import {
	FamilyMemberDetailPage,
	FamilyMemberFormPage,
	FamilyOverviewPage,
} from '@/features/family'
import { ModulesPage } from '@/features/modules'
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
	DocumentsLibraryPage,
	DocumentsPage,
} from '@/features/documents'
import { DocumentsCategoryPage } from '@/features/documents/pages/DocumentsCategoryPage'
import { TimelinePage } from '@/features/timeline'
import { SearchPage } from '@/features/search'
import {
	InsuranceHomePage,
	InsuranceLayout,
	InsurancePoliciesPage,
	InsurancePolicyDetailPage,
	InsuranceClaimsPage,
	InsuranceClaimDetailPage,
	InsuranceTimelinePage,
	InsuranceAskPage,
	InsuranceSettingsPage,
	InsuranceProtectionPage,
	InsuranceProtectionDetailPage,
} from '@/features/insurance'
import {
	VehicleLayout,
	VehicleHomePage,
	VehicleDetailPage,
	VehicleTimelinePage,
	VehicleSettingsPage,
	VehicleAskPage,
} from '@/features/vehicles'
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
					<Route path={ROUTES.notifications} element={<NotificationsPage />} />
					<Route path={ROUTES.mail} element={<MailPage />} />
					<Route path={ROUTES.tasks} element={<TasksPage />} />
					<Route path={ROUTES.modules} element={<ModulesPage />} />
					<Route
						path={ROUTES.more}
						element={<Navigate to={ROUTES.modules} replace />}
					/>
					<Route path={ROUTES.documents} element={<DocumentsLayout />}>
						<Route index element={<DocumentsPage />} />
						<Route path="library" element={<DocumentsLibraryPage />} />
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
						element={<Navigate to={ROUTES.healthImportCenter} replace />}
					/>
					<Route
						path={ROUTES.connectorsGoogleDrive}
						element={<Navigate to={ROUTES.healthFolderSetup} replace />}
					/>
					<Route
						path={ROUTES.healthImport}
						element={<Navigate to={ROUTES.healthImportCenter} replace />}
					/>
					<Route
						path={ROUTES.healthTrends}
						element={<Navigate to={ROUTES.health} replace />}
					/>
					<Route
						path={ROUTES.healthImportReview}
						element={<Navigate to={ROUTES.healthImportCenter} replace />}
					/>

					<Route path={ROUTES.health} element={<HealthLayout />}>
						<Route index element={<HealthHomePage />} />
						<Route path="progress" element={<HealthProgressPage />} />
						<Route path="history" element={<HealthHistoryPage />} />
						<Route path="reports" element={<HealthReportsPage />} />
						<Route path="visits/:visitId" element={<HealthVisitDetailPage />} />
						<Route path="ask" element={<HealthAskPage />} />
						<Route path="settings" element={<HealthSettingsPage />} />
						<Route path="import-center" element={<HealthImportCenterPage />} />
						<Route
							path="settings/import"
							element={<Navigate to={ROUTES.healthImportCenter} replace />}
						/>
						<Route
							path="settings/folders"
							element={<HealthFolderSetupPage />}
						/>
						<Route
							path="timeline"
							element={<Navigate to={ROUTES.healthHistory} replace />}
						/>
						<Route
							path="metrics"
							element={<Navigate to={ROUTES.health} replace />}
						/>
						<Route
							path="insights"
							element={<Navigate to={ROUTES.health} replace />}
						/>
					</Route>

					<Route path={ROUTES.insurance} element={<InsuranceLayout />}>
						<Route index element={<InsuranceHomePage />} />
						<Route path="coverage" element={<InsuranceProtectionPage />} />
						<Route
							path="coverage/:categoryId"
							element={<InsuranceProtectionDetailPage />}
						/>
						<Route path="policies" element={<InsurancePoliciesPage />} />
						<Route
							path="policies/:policyId"
							element={<InsurancePolicyDetailPage />}
						/>
						<Route path="claims" element={<InsuranceClaimsPage />} />
						<Route
							path="claims/:claimId"
							element={<InsuranceClaimDetailPage />}
						/>
						<Route path="timeline" element={<InsuranceTimelinePage />} />
						<Route path="ask" element={<InsuranceAskPage />} />
						<Route path="settings" element={<InsuranceSettingsPage />} />
					</Route>

					<Route path={ROUTES.vehicles} element={<VehicleLayout />}>
						<Route index element={<VehicleHomePage />} />
						<Route path="timeline" element={<VehicleTimelinePage />} />
						<Route path="ask" element={<VehicleAskPage />} />
						<Route path="settings" element={<VehicleSettingsPage />} />
						<Route path=":vehicleSlug" element={<VehicleDetailPage />} />
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
								element={<Navigate to={ROUTES.healthImportCenter} replace />}
							/>
							<Route
								path={ROUTES.healthKnowledgeDebug}
								element={<Navigate to={ROUTES.health} replace />}
							/>
							<Route
								path={ROUTES.healthValidation}
								element={<Navigate to={ROUTES.health} replace />}
							/>
							<Route
								path={ROUTES.healthDiscovery}
								element={<Navigate to={ROUTES.healthImportCenter} replace />}
							/>
							<Route
								path={ROUTES.healthImportWizard}
								element={<Navigate to={ROUTES.healthImportCenter} replace />}
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
								element={<Navigate to={ROUTES.healthImportCenter} replace />}
							/>
							<Route
								path={ROUTES.healthImportWizard}
								element={<Navigate to={ROUTES.healthImportCenter} replace />}
							/>
							<Route
								path={ROUTES.healthImportDebug}
								element={<Navigate to={ROUTES.healthImportCenter} replace />}
							/>
							<Route
								path={ROUTES.healthKnowledgeDebug}
								element={<Navigate to={ROUTES.health} replace />}
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
