export const ROUTES = {
	root: '/',
	login: '/login',
	home: '/home',
	ask: '/ask',
	mail: '/mail',
	tasks: '/tasks',
	more: '/more',
	health: '/health',
	healthReport: '/health/reports/:reportId',
} as const

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES]

export const DEFAULT_AUTHENTICATED_ROUTE = ROUTES.home

export function healthReportPath(reportId: string) {
	return `/health/reports/${reportId}`
}
