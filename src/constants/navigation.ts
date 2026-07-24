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
	{ moduleId: 'mail', path: ROUTES.mail, label: 'Mail', badge: '9+' },
	{ moduleId: 'tasks', path: ROUTES.tasks, label: 'Tasks', badge: '8' },
	{ moduleId: 'more', path: ROUTES.more, label: 'More', badge: '' },
]

export const NAV_BAR_STYLE = {
	position: 'absolute' as const,
	bottom: 0,
	left: 0,
	right: 0,
	background: 'rgba(12,12,18,0.92)',
	backdropFilter: 'blur(20px)',
	WebkitBackdropFilter: 'blur(20px)',
	padding: '12px 6px 26px',
	display: 'flex',
	justifyContent: 'space-around',
	zIndex: 50,
}
