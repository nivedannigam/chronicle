import { ROUTES } from '@/constants/routes'

export const HEALTH_NAV_ITEMS = [
	{ label: 'Overview', path: ROUTES.health },
	{ label: 'Reports', path: ROUTES.healthReports },
	{ label: 'Timeline', path: ROUTES.healthTimeline },
	{ label: 'Metrics', path: ROUTES.healthMetrics },
	{ label: 'Insights', path: ROUTES.healthInsights },
	{ label: 'Settings', path: ROUTES.healthSettings },
] as const
