import { ROUTES } from '@/constants/routes'
import type { Tab } from '@/types/navigation'

const TAB_ROUTES: Record<Tab, string> = {
	home: ROUTES.home,
	ask: ROUTES.ask,
	mail: ROUTES.mail,
	tasks: ROUTES.tasks,
	more: ROUTES.more,
}

export function tabFromPath(pathname: string): Tab {
	if (pathname.startsWith(ROUTES.ask)) return 'ask'
	if (pathname.startsWith(ROUTES.mail)) return 'mail'
	if (pathname.startsWith(ROUTES.tasks)) return 'tasks'
	if (pathname.startsWith(ROUTES.more)) return 'more'
	return 'home'
}

export function pathFromTab(tab: Tab): string {
	return TAB_ROUTES[tab]
}
