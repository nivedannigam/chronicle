import { ROUTES } from '@/constants/routes'
import type { Tab } from '@/types/navigation'

const TAB_ROUTES: Record<Tab, string> = {
	home: ROUTES.home,
	modules: ROUTES.modules,
	ask: ROUTES.ask,
	library: ROUTES.documents,
	profile: ROUTES.profile,
}

const MODULE_ROUTE_PREFIXES = [
	ROUTES.health,
	ROUTES.insurance,
	ROUTES.vehicles,
] as const

export function tabFromPath(pathname: string): Tab {
	if (pathname.startsWith(ROUTES.ask)) return 'ask'
	if (pathname.startsWith(ROUTES.documents)) return 'library'
	if (
		pathname.startsWith(ROUTES.profile) ||
		pathname.startsWith(ROUTES.settings) ||
		pathname.startsWith(ROUTES.family)
	) {
		return 'profile'
	}
	if (pathname.startsWith(ROUTES.modules) || pathname.startsWith(ROUTES.more)) {
		return 'modules'
	}
	if (pathname.startsWith(ROUTES.home)) return 'home'

	if (MODULE_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
		return 'modules'
	}

	if (
		pathname.startsWith(ROUTES.search) ||
		pathname.startsWith(ROUTES.mail) ||
		pathname.startsWith(ROUTES.tasks) ||
		pathname.startsWith(ROUTES.notifications)
	) {
		return 'home'
	}

	return 'home'
}

export function pathFromTab(tab: Tab): string {
	return TAB_ROUTES[tab]
}
