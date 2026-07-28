import { ROUTES } from '@/constants/routes'
import type { Tab } from '@/types/navigation'

const TAB_ROUTES: Record<Tab, string> = {
	home: ROUTES.home,
	health: ROUTES.health,
	ask: ROUTES.ask,
	more: ROUTES.more,
	profile: ROUTES.profile,
}

const MORE_MODULE_PREFIXES = [
	ROUTES.documents,
	ROUTES.family,
	ROUTES.settings,
	ROUTES.preferences,
	ROUTES.integrations,
	ROUTES.settingsAccount,
	ROUTES.settingsData,
	ROUTES.settingsConnectorsDrive,
	ROUTES.settingsNotifications,
	ROUTES.settingsAppearance,
	ROUTES.search,
	ROUTES.timeline,
	ROUTES.mail,
	ROUTES.tasks,
] as const

export function tabFromPath(pathname: string): Tab {
	if (pathname.startsWith(ROUTES.ask)) return 'ask'
	if (pathname.startsWith(ROUTES.health)) return 'health'
	if (
		pathname.startsWith(ROUTES.profile) ||
		pathname.startsWith(ROUTES.settings)
	) {
		return 'profile'
	}
	if (pathname.startsWith(ROUTES.more)) return 'more'
	if (pathname.startsWith(ROUTES.home)) return 'home'

	if (MORE_MODULE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
		return 'more'
	}

	return 'home'
}

export function pathFromTab(tab: Tab): string {
	return TAB_ROUTES[tab]
}
