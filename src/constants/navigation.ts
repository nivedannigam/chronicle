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
	{ moduleId: 'library', path: ROUTES.documents, label: 'Library', badge: '' },
	{ moduleId: 'ask', path: ROUTES.ask, label: 'Ask', badge: '' },
	{ moduleId: 'timeline', path: ROUTES.timeline, label: 'Timeline', badge: '' },
	{ moduleId: 'profile', path: ROUTES.profile, label: 'You', badge: '' },
]

export const NAV_BAR_STYLE = {
	position: 'absolute' as const,
	bottom: 22,
	left: 14,
	right: 14,
}
