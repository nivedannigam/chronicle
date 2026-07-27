import {
	FileText,
	FolderOpen,
	Gem,
	GraduationCap,
	Heart,
	Home,
	KeyRound,
	Landmark,
	Plane,
	Shield,
	Sparkles,
	User,
} from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import type { ModuleDefinition } from '@/types/modules'
import type { Tab } from '@/types/navigation'

export const MODULE_REGISTRY: ModuleDefinition[] = [
	{
		id: 'home',
		name: 'Home',
		icon: Home,
		enabled: true,
		comingSoon: false,
	},
	{
		id: 'health',
		name: 'Health',
		icon: Heart,
		enabled: true,
		comingSoon: false,
		color: C.teal,
	},
	{
		id: 'ask',
		name: 'Ask Chronicle',
		icon: Sparkles,
		enabled: true,
		comingSoon: false,
		color: C.accent,
	},
	{
		id: 'more',
		name: 'More',
		icon: FolderOpen,
		enabled: true,
		comingSoon: false,
	},
	{
		id: 'profile',
		name: 'Profile',
		icon: User,
		enabled: true,
		comingSoon: false,
	},
	{
		id: 'finance',
		name: 'Finance',
		icon: Landmark,
		enabled: false,
		comingSoon: true,
		color: C.greenAlt,
	},
	{
		id: 'documents',
		name: 'Documents',
		icon: FileText,
		enabled: true,
		comingSoon: false,
		color: C.accent,
	},
	{
		id: 'insurance',
		name: 'Insurance',
		icon: Shield,
		enabled: false,
		comingSoon: true,
		color: C.accentBlue,
	},
	{
		id: 'travel',
		name: 'Travel',
		icon: Plane,
		enabled: false,
		comingSoon: true,
		color: C.orange,
	},
	{
		id: 'education',
		name: 'Education',
		icon: GraduationCap,
		enabled: false,
		comingSoon: true,
		color: C.accentBlue,
	},
	{
		id: 'assets',
		name: 'Assets',
		icon: Gem,
		enabled: false,
		comingSoon: true,
		color: C.yellow,
	},
	{
		id: 'passwords',
		name: 'Passwords',
		icon: KeyRound,
		enabled: false,
		comingSoon: true,
		color: C.photos,
	},
]

export const MORE_COMING_SOON_MODULE_IDS = [
	'finance',
	'insurance',
	'travel',
	'education',
	'assets',
	'passwords',
] as const

/** @deprecated Use MORE_COMING_SOON_MODULE_IDS */
export const DASHBOARD_COMING_SOON_MODULE_IDS = MORE_COMING_SOON_MODULE_IDS

export const MODULE_ROUTES: Partial<Record<string, string>> = {
	health: ROUTES.health,
	documents: ROUTES.documents,
	family: ROUTES.family,
	timeline: ROUTES.timeline,
}

export function getModuleById(id: string): ModuleDefinition | undefined {
	return MODULE_REGISTRY.find((module) => module.id === id)
}

export function getModuleByTab(tab: Tab): ModuleDefinition | undefined {
	const tabModuleIds: Record<Tab, string> = {
		home: 'home',
		ask: 'ask',
		mail: 'mail',
		tasks: 'tasks',
		more: 'more',
	}

	return getModuleById(tabModuleIds[tab])
}

export const EXPLORE_CAPABILITY_IDS = [
	'health',
	'documents',
	...MORE_COMING_SOON_MODULE_IDS,
] as const

export function getExploreCapabilities(): ModuleDefinition[] {
	return EXPLORE_CAPABILITY_IDS.map((id) => getModuleById(id)).filter(
		(module): module is ModuleDefinition => module !== undefined,
	)
}

export function getMoreComingSoonModules(): ModuleDefinition[] {
	return MORE_COMING_SOON_MODULE_IDS.map((id) => getModuleById(id)).filter(
		(module): module is ModuleDefinition => module !== undefined,
	)
}

/** @deprecated Use getMoreComingSoonModules */
export function getComingSoonModules(): ModuleDefinition[] {
	return getMoreComingSoonModules()
}
