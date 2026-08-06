export const ROUTES = {
	root: '/',
	login: '/login',
	authCallback: '/auth/callback',
	search: '/search',
	home: '/home',
	homeActivity: '/home/activity',
	timeline: '/timeline',
	family: '/family',
	familyMember: '/family/members/:memberId',
	familyMemberNew: '/family/members/new',
	familyMemberEdit: '/family/members/:memberId/edit',
	integrations: '/integrations',
	settings: '/settings',
	preferences: '/settings/preferences',
	settingsNotifications: '/settings/notifications',
	settingsAppearance: '/settings/appearance',
	ask: '/ask',
	mail: '/mail',
	tasks: '/tasks',
	more: '/more',
	health: '/health',
	healthProgress: '/health/progress',
	healthReports: '/health/reports',
	healthVisit: '/health/visits/:visitId',
	healthHistory: '/health/history',
	healthAsk: '/health/ask',
	healthTimeline: '/health/timeline',
	healthMetrics: '/health/metrics',
	healthInsights: '/health/insights',
	healthSettings: '/health/settings',
	healthSettingsImport: '/health/settings/import',
	healthImportCenter: '/health/import-center',
	healthFolderSetup: '/health/settings/folders',
	healthTrends: '/health/metrics',
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
	documents: '/documents',
	documentsExpiring: '/documents/expiring',
	documentsCategory: '/documents/category/:categoryId',
	documentDetail: '/documents/:documentId',
	settingsAccount: '/settings/account',
	settingsHealthSources: '/settings/health-sources',
	settingsConnectorsDrive: '/settings/connectors/drive',
	settingsImport: '/settings/import',
	settingsData: '/settings/data',
	profile: '/profile',
	profilePersonal: '/profile/personal',
	profileFamily: '/profile/family',
	profileConnections: '/profile/connections',
	profileConnectionsDrive: '/profile/connections/drive',
	profilePreferences: '/profile/preferences',
	profileSecurity: '/profile/security',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

export const DEFAULT_AUTHENTICATED_ROUTE = ROUTES.home

export function familyMemberPath(memberId: string) {
	return `/family/members/${memberId}`
}

export function familyMemberEditPath(memberId: string) {
	return `/family/members/${memberId}/edit`
}

export function healthReportPath(reportId: string) {
	return `/health/reports/${reportId}`
}

export function healthVisitPath(visitId: string) {
	return `/health/visits/${visitId}`
}

export function healthMetricPath(metricId: string) {
	return `/health/metrics/${metricId}`
}

export function healthOcrPreviewPath(reportId: string) {
	return `/health/reports/${reportId}/ocr`
}

export function documentPath(documentId: string) {
	return `/documents/${documentId}`
}

export function documentsCategoryPath(categoryId: string) {
	return `/documents/category/${categoryId}`
}

export type HealthSettingsSection = 'review' | 'import' | 'import-issues'

export function healthSettingsSection(section: HealthSettingsSection) {
	if (
		section === 'review' ||
		section === 'import-issues' ||
		section === 'import'
	) {
		return ROUTES.healthImportCenter
	}

	return ROUTES.healthSettings
}

export function healthAskPath(input?: {
	q?: string
	reportId?: string
	visitId?: string
	categoryId?: string
}) {
	const params = new URLSearchParams()

	if (input?.q) {
		params.set('q', input.q)
	}

	if (input?.reportId) {
		params.set('reportId', input.reportId)
	}

	if (input?.visitId) {
		params.set('visitId', input.visitId)
	}

	if (input?.categoryId) {
		params.set('categoryId', input.categoryId)
	}

	const query = params.toString()
	return query ? `${ROUTES.healthAsk}?${query}` : ROUTES.healthAsk
}

export const isHealthCompareEnabled = import.meta.env.DEV
