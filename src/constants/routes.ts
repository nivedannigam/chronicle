export const ROUTES = {
	root: '/',
	login: '/login',
	home: '/home',
	ask: '/ask',
	mail: '/mail',
	tasks: '/tasks',
	more: '/more',
	health: '/health',
	healthReports: '/health/reports',
	healthTrends: '/health/trends',
	healthCompare: '/health/compare',
	healthReport: '/health/reports/:reportId',
	healthMetric: '/health/metrics/:metricId',
	healthKnowledgeDebug: '/health/knowledge-debug',
	connectorsGoogleDrive: '/connectors/google-drive',
	connectorsDebug: '/connectors/debug',
	healthSources: '/settings/health-sources',
	healthImport: '/health/import',
	healthImportWizard: '/health/import/wizard',
	healthImportDebug: '/health/import/debug',
	healthDiscovery: '/health/discovery',
	healthImportReview: '/health/import/review',
	healthValidation: '/health/validation',
	healthOcrPreview: '/health/reports/:reportId/ocr',
	settingsAccount: '/settings/account',
	settingsHealthSources: '/settings/health-sources',
	settingsConnectorsDrive: '/settings/connectors/drive',
	settingsImport: '/settings/import',
	settingsData: '/settings/data',
	profile: '/profile',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

export const DEFAULT_AUTHENTICATED_ROUTE = ROUTES.home

export function healthReportPath(reportId: string) {
	return `/health/reports/${reportId}`
}

export function healthMetricPath(metricId: string) {
	return `/health/metrics/${metricId}`
}

export function healthOcrPreviewPath(reportId: string) {
	return `/health/reports/${reportId}/ocr`
}
