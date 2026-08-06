import { ROUTES } from '@/constants/routes'
import type { Tab } from '@/types/navigation'

const TAB_ROUTES: Record<Tab, string> = {
	home: ROUTES.home,
	library: ROUTES.documents,
	ask: ROUTES.ask,
	timeline: ROUTES.timeline,
	profile: ROUTES.profile,
}

const MODULE_PREFIXES = [
	ROUTES.health,
	ROUTES.insurance,
	ROUTES.more,
	ROUTES.search,
	ROUTES.mail,
	ROUTES.tasks,
	ROUTES.settings,
] as const

export function tabFromPath(pathname: string): Tab {
	if (pathname.startsWith(ROUTES.ask)) return 'ask'
	if (pathname.startsWith(ROUTES.documents)) return 'library'
	if (pathname.startsWith(ROUTES.timeline)) return 'timeline'
	if (
		pathname.startsWith(ROUTES.profile) ||
		pathname.startsWith(ROUTES.settings) ||
		pathname.startsWith(ROUTES.family)
	) {
		return 'profile'
	}
	if (pathname.startsWith(ROUTES.home)) return 'home'

	if (pathname.startsWith(ROUTES.notifications)) return 'home'

	if (MODULE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
		return 'home'
	}

	return 'home'
}

export function pathFromTab(tab: Tab): string {
	return TAB_ROUTES[tab]
}
