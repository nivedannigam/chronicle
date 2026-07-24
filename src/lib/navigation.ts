import { ROUTES } from '@/constants/routes'
import type { Tab } from '@/types/navigation'

const TAB_ROUTES: Record<Tab, string> = {
	home: ROUTES.home,
	health: ROUTES.health,
	ask: ROUTES.ask,
	more: ROUTES.more,
	profile: ROUTES.profile,
}

export function tabFromPath(pathname: string): Tab {
	if (pathname.startsWith(ROUTES.health)) return 'health'
	if (pathname.startsWith(ROUTES.ask)) return 'ask'
	if (pathname.startsWith(ROUTES.more)) return 'more'
	if (
		pathname.startsWith(ROUTES.profile) ||
		pathname.startsWith(ROUTES.settings) ||
		pathname.startsWith(ROUTES.preferences) ||
		pathname.startsWith(ROUTES.integrations) ||
		pathname.startsWith(ROUTES.family) ||
		pathname.startsWith(ROUTES.settingsAccount) ||
		pathname.startsWith(ROUTES.settingsData) ||
		pathname.startsWith(ROUTES.settingsConnectorsDrive) ||
		pathname.startsWith(ROUTES.settingsNotifications) ||
		pathname.startsWith(ROUTES.settingsAppearance)
	) {
		return 'profile'
	}
	if (pathname.startsWith(ROUTES.home)) return 'home'
	return 'home'
}

export function pathFromTab(tab: Tab): string {
	return TAB_ROUTES[tab]
}
