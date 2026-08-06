import { ROUTES } from '@/constants/routes'
import { HEALTH_COPY } from '@/constants/product-copy'

export const HEALTH_NAV_ITEMS = [
	{ label: HEALTH_COPY.homeTab, path: ROUTES.health },
	{ label: HEALTH_COPY.progressTab, path: ROUTES.healthProgress },
	{ label: HEALTH_COPY.historyTab, path: ROUTES.healthHistory },
	{ label: HEALTH_COPY.reportsTab, path: ROUTES.healthReports },
	{ label: HEALTH_COPY.askTab, path: ROUTES.healthAsk },
	{ label: HEALTH_COPY.settingsTab, path: ROUTES.healthSettings },
] as const
