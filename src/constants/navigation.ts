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
	{ moduleId: 'health', path: ROUTES.health, label: 'Health', badge: '' },
	{ moduleId: 'ask', path: ROUTES.ask, label: 'Ask', badge: '' },
	{ moduleId: 'more', path: ROUTES.more, label: 'More', badge: '' },
	{ moduleId: 'profile', path: ROUTES.profile, label: 'Profile', badge: '' },
]

export const NAV_BAR_STYLE = {
	position: 'absolute' as const,
	bottom: 22,
	left: 14,
	right: 14,
}
