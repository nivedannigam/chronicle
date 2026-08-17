import {
	Briefcase,
	Car,
	FileText,
	Gem,
	GraduationCap,
	Heart,
	Home,
	KeyRound,
	Landmark,
	LayoutGrid,
	Plane,
	Shield,
	Sparkles,
	User,
	Users,
} from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import type { ModuleDefinition } from '@/types/modules'
import type { Tab } from '@/types/navigation'

/** Life modules and shell entries registered for product navigation. */
export const MODULE_REGISTRY: ModuleDefinition[] = [
	{
		id: 'home',
		name: 'Home',
		icon: Home,
		enabled: true,
		comingSoon: false,
	},
	{
		id: 'modules',
		name: 'Modules',
		icon: LayoutGrid,
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
		description: 'Your health reports, progress and history',
		route: ROUTES.health,
	},
	{
		id: 'insurance',
		name: 'Insurance',
		icon: Shield,
		enabled: true,
		comingSoon: false,
		color: C.accentBlue,
		description: 'Policies, protection and claims',
		route: ROUTES.insurance,
	},
	{
		id: 'vehicles',
		name: 'Vehicles',
		icon: Car,
		enabled: true,
		comingSoon: false,
		color: C.orange,
		description: 'Vehicles, documents, insurance and service history',
		route: ROUTES.vehicles,
	},
	{
		id: 'ask',
		name: 'Ask Chronicle',
		icon: Sparkles,
		enabled: true,
		comingSoon: false,
		color: C.accent,
		route: ROUTES.ask,
	},
	{
		id: 'profile',
		name: 'Profile',
		icon: User,
		enabled: true,
		comingSoon: false,
		route: ROUTES.profile,
	},
	{
		id: 'documents',
		name: 'Documents',
		icon: FileText,
		enabled: true,
		comingSoon: false,
		color: C.accent,
		description: 'Your important documents, all in one place',
		route: ROUTES.documents,
	},
	{
		id: 'identity',
		name: 'Identity',
		icon: Users,
		enabled: false,
		comingSoon: true,
		color: C.accentBlue,
	},
	{
		id: 'property',
		name: 'Property',
		icon: Gem,
		enabled: false,
		comingSoon: true,
		color: C.orange,
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
		id: 'employment',
		name: 'Employment',
		icon: Briefcase,
		enabled: false,
		comingSoon: true,
		color: C.yellow,
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

export const ACTIVE_LIFE_MODULE_IDS = [
	'health',
	'insurance',
	'vehicles',
] as const

export const COMING_SOON_MODULE_IDS = [
	'identity',
	'property',
	'finance',
	'travel',
	'education',
	'employment',
	'assets',
	'passwords',
] as const

/** @deprecated Use COMING_SOON_MODULE_IDS */
export const MORE_COMING_SOON_MODULE_IDS = COMING_SOON_MODULE_IDS

/** @deprecated Use COMING_SOON_MODULE_IDS */
export const DASHBOARD_COMING_SOON_MODULE_IDS = COMING_SOON_MODULE_IDS

export const MODULE_ROUTES: Partial<Record<string, string>> = {
	health: ROUTES.health,
	insurance: ROUTES.insurance,
	vehicles: ROUTES.vehicles,
	documents: ROUTES.documents,
	modules: ROUTES.modules,
	family: ROUTES.profileFamily,
	timeline: ROUTES.timeline,
}

export function getModuleById(id: string): ModuleDefinition | undefined {
	return MODULE_REGISTRY.find((module) => module.id === id)
}

export function getModuleByTab(tab: Tab): ModuleDefinition | undefined {
	const tabModuleIds: Record<Tab, string> = {
		home: 'home',
		modules: 'modules',
		library: 'documents',
		ask: 'ask',
		profile: 'profile',
	}

	return getModuleById(tabModuleIds[tab])
}

export function getActiveLifeModules(): ModuleDefinition[] {
	return ACTIVE_LIFE_MODULE_IDS.map((id) => getModuleById(id)).filter(
		(module): module is ModuleDefinition => module !== undefined,
	)
}

export function getComingSoonModules(): ModuleDefinition[] {
	return COMING_SOON_MODULE_IDS.map((id) => getModuleById(id)).filter(
		(module): module is ModuleDefinition => module !== undefined,
	)
}

/** @deprecated Use getComingSoonModules */
export function getMoreComingSoonModules(): ModuleDefinition[] {
	return getComingSoonModules()
}

export const EXPLORE_CAPABILITY_IDS = [
	...ACTIVE_LIFE_MODULE_IDS,
	'documents',
	...COMING_SOON_MODULE_IDS,
] as const

export function getExploreCapabilities(): ModuleDefinition[] {
	return EXPLORE_CAPABILITY_IDS.map((id) => getModuleById(id)).filter(
		(module): module is ModuleDefinition => module !== undefined,
	)
}
