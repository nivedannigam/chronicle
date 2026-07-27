import { ROUTES } from '@/constants/routes'
import type { Tab } from '@/types/navigation'

export interface NavigationItem {
	moduleId: Tab
	path: string
	label: string
	badge: string
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
	{ moduleId: 'home', path: ROUTES.home, label: 'Home', badge: '' },
	{ moduleId: 'ask', path: ROUTES.ask, label: 'Ask', badge: '' },
	{ moduleId: 'mail', path: ROUTES.mail, label: 'Mail', badge: '' },
	{ moduleId: 'tasks', path: ROUTES.tasks, label: 'Tasks', badge: '' },
	{ moduleId: 'more', path: ROUTES.more, label: 'More', badge: '' },
]
