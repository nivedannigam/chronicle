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
	modules: '/modules',
	personal: '/personal',
	setup: '/setup',
	reviewDocuments: '/health/review-documents',
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
	documentsLibrary: '/documents/library',
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
	profileAdvanced: '/profile/advanced',
	profileStorage: '/profile/storage',
	insurance: '/insurance',
	insuranceCoverage: '/insurance/coverage',
	insuranceCoverageDetail: '/insurance/coverage/:categoryId',
	insurancePolicies: '/insurance/policies',
	insurancePolicyDetail: '/insurance/policies/:policyId',
	insuranceClaims: '/insurance/claims',
	insuranceClaimDetail: '/insurance/claims/:claimId',
	insuranceTimeline: '/insurance/timeline',
	insuranceAsk: '/insurance/ask',
	insuranceSettings: '/insurance/settings',
	vehicles: '/vehicles',
	vehiclesTimeline: '/vehicles/timeline',
	vehiclesSettings: '/vehicles/settings',
	vehiclesAsk: '/vehicles/ask',
	vehiclesDetail: '/vehicles/:vehicleSlug',
	identity: '/identity',
	identitySettings: '/identity/settings',
	identityMember: '/identity/members/:memberId',
	identityDocument: '/identity/documents/:documentId',
	finance: '/finance',
	financeSettings: '/finance/settings',
	financeHistory: '/finance/history',
	financeHistoryEvent: '/finance/history/events/:eventId',
	financeDocument: '/finance/documents/:documentId',
	property: '/property',
	propertySettings: '/property/settings',
	propertyHistory: '/property/history',
	propertyHistoryEvent: '/property/history/events/:eventId',
	propertyDetail: '/property/:propertySlug',
	propertyDocument: '/property/documents/:documentId',
	notifications: '/notifications',
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
		return ROUTES.reviewDocuments
	}

	return ROUTES.healthSettings
}

export type AskContextModule =
	'health' | 'insurance' | 'vehicles' | 'identity' | 'finance' | 'property'

export function globalAskPath(input?: {
	q?: string
	context?: AskContextModule
	reportId?: string
	visitId?: string
	categoryId?: string
	policyId?: string
	claimId?: string
	documentId?: string
	vehicleSlug?: string
	entity?: string
}) {
	const params = new URLSearchParams()

	if (input?.context) {
		params.set('context', input.context)
	}

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

	if (input?.policyId) {
		params.set('policyId', input.policyId)
	}

	if (input?.claimId) {
		params.set('claimId', input.claimId)
	}

	if (input?.documentId) {
		params.set('documentId', input.documentId)
	}

	if (input?.vehicleSlug) {
		params.set('vehicleSlug', input.vehicleSlug)
	}

	if (input?.entity) {
		params.set('entity', input.entity)
	}

	const query = params.toString()
	return query ? `${ROUTES.ask}?${query}` : ROUTES.ask
}

export function healthAskPath(input?: {
	q?: string
	reportId?: string
	visitId?: string
	categoryId?: string
}) {
	return globalAskPath({ ...input, context: 'health' })
}

export const isHealthCompareEnabled = import.meta.env.DEV

export function insuranceCoverageDetailPath(categoryId: string) {
	return `/insurance/coverage/${categoryId}`
}

export function insurancePolicyDetailPath(policyId: string) {
	return `/insurance/policies/${policyId}`
}

export function insuranceClaimDetailPath(claimId: string) {
	return `/insurance/claims/${claimId}`
}

export function insuranceAskPath(input?: {
	q?: string
	categoryId?: string
	policyId?: string
	claimId?: string
}) {
	return globalAskPath({ ...input, context: 'insurance' })
}

export function vehicleAskPath(input?: { q?: string; vehicleSlug?: string }) {
	return globalAskPath({ ...input, context: 'vehicles' })
}

export function vehicleDetailPath(vehicleSlug: string) {
	return `/vehicles/${vehicleSlug}`
}

export function identityMemberPath(memberId: string) {
	return `/identity/members/${memberId}`
}

export function identityDocumentPath(documentId: string) {
	return `/identity/documents/${documentId}`
}

export function identityAskPath(input?: { q?: string; documentId?: string }) {
	return globalAskPath({ ...input, context: 'identity' })
}

export function financeAskPath(input?: {
	q?: string
	documentId?: string
	entityId?: string
}) {
	return globalAskPath({
		q: input?.q,
		context: 'finance',
		documentId: input?.documentId,
		entity: input?.entityId,
	})
}

export function financeDocumentPath(documentId: string) {
	return `/finance/documents/${documentId}`
}

export function financeHistoryEventPath(eventId: string) {
	return `/finance/history/events/${encodeURIComponent(eventId)}`
}

export function propertyAskPath(input?: {
	q?: string
	documentId?: string
	propertySlug?: string
	entity?: string
}) {
	return globalAskPath({
		q: input?.q,
		context: 'property',
		documentId: input?.documentId,
		entity: input?.entity ?? input?.propertySlug,
	})
}

export function propertyDetailPath(propertySlug: string) {
	return `/property/${encodeURIComponent(propertySlug)}`
}

export function propertyDocumentPath(documentId: string) {
	return `/property/documents/${documentId}`
}

export function propertyHistoryEventPath(eventId: string) {
	return `/property/history/events/${encodeURIComponent(eventId)}`
}
