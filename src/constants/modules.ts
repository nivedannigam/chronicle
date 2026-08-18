import {
	Briefcase,
	Car,
	FileText,
	GraduationCap,
	Heart,
	Home,
	IdCard,
	Landmark,
	LayoutGrid,
	Plane,
	Shield,
	Sparkles,
	User,
} from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import type { ModuleDefinition, ModuleStatus } from '@/types/modules'
import type { Tab } from '@/types/navigation'

function withLegacyFlags(module: ModuleDefinition): ModuleDefinition {
	return {
		...module,
		enabled: module.status === 'available',
		comingSoon: module.status === 'coming_soon',
	}
}

/** Life domains shown on the Modules hub — single source of truth. */
export const LIFE_MODULE_REGISTRY: ModuleDefinition[] = [
	withLegacyFlags({
		id: 'health',
		name: 'Health',
		description: 'Your health records, progress and history',
		icon: Heart,
		status: 'available',
		category: 'life',
		color: C.teal,
		route: ROUTES.health,
	}),
	withLegacyFlags({
		id: 'insurance',
		name: 'Insurance',
		description: 'Policies, coverage and renewals',
		icon: Shield,
		status: 'available',
		category: 'life',
		color: C.accentBlue,
		route: ROUTES.insurance,
	}),
	withLegacyFlags({
		id: 'vehicles',
		name: 'Vehicles',
		description: 'Cars, documents, insurance and service',
		icon: Car,
		status: 'available',
		category: 'life',
		color: C.orange,
		route: ROUTES.vehicles,
	}),
	withLegacyFlags({
		id: 'identity',
		name: 'Identity',
		description: 'Passports, IDs and family documents',
		icon: IdCard,
		status: 'available',
		category: 'life',
		color: C.accentBlue,
		route: ROUTES.identity,
	}),
	withLegacyFlags({
		id: 'personal',
		name: 'Personal',
		description: 'Your personal documents',
		icon: FileText,
		status: 'available',
		category: 'life',
		color: C.textSec,
		route: ROUTES.personal,
	}),
	withLegacyFlags({
		id: 'property',
		name: 'Property',
		description: 'Your homes and property documents',
		icon: Home,
		status: 'coming_soon',
		category: 'life',
		color: C.greenAlt,
	}),
	withLegacyFlags({
		id: 'finance',
		name: 'Finance',
		description: 'Your financial life',
		icon: Landmark,
		status: 'coming_soon',
		category: 'life',
		color: C.greenAlt,
	}),
	withLegacyFlags({
		id: 'travel',
		name: 'Travel',
		description: 'Trips and travel documents',
		icon: Plane,
		status: 'coming_soon',
		category: 'life',
		color: C.orange,
	}),
	withLegacyFlags({
		id: 'education',
		name: 'Education',
		description: 'School and education records',
		icon: GraduationCap,
		status: 'coming_soon',
		category: 'life',
		color: C.accentBlue,
	}),
	withLegacyFlags({
		id: 'employment',
		name: 'Employment',
		description: 'Work and employment documents',
		icon: Briefcase,
		status: 'coming_soon',
		category: 'life',
		color: C.yellow,
	}),
]

const SHELL_MODULE_REGISTRY: ModuleDefinition[] = [
	withLegacyFlags({
		id: 'home',
		name: 'Home',
		description: 'Your Chronicle home',
		icon: Home,
		status: 'available',
		category: 'shell',
		route: ROUTES.home,
	}),
	withLegacyFlags({
		id: 'modules',
		name: 'Modules',
		description: 'Everything Chronicle can help you organize',
		icon: LayoutGrid,
		status: 'available',
		category: 'shell',
		route: ROUTES.modules,
	}),
	withLegacyFlags({
		id: 'ask',
		name: 'Ask Chronicle',
		description: 'Ask questions across your life',
		icon: Sparkles,
		status: 'available',
		category: 'shell',
		color: C.accent,
		route: ROUTES.ask,
	}),
	withLegacyFlags({
		id: 'profile',
		name: 'You',
		description: 'Profile and settings',
		icon: User,
		status: 'available',
		category: 'shell',
		route: ROUTES.profile,
	}),
	withLegacyFlags({
		id: 'documents',
		name: 'Library',
		description: 'Your important documents, all in one place',
		icon: FileText,
		status: 'available',
		category: 'shell',
		color: C.accent,
		route: ROUTES.documents,
	}),
]

/** Full registry including shell navigation entries. */
export const MODULE_REGISTRY: ModuleDefinition[] = [
	...SHELL_MODULE_REGISTRY,
	...LIFE_MODULE_REGISTRY,
]

export const HUB_PRIMARY_MODULE_IDS = [
	'health',
	'insurance',
	'vehicles',
	'identity',
] as const

export const HUB_AVAILABLE_MODULE_IDS = [
	...HUB_PRIMARY_MODULE_IDS,
	'personal',
] as const

export const ACTIVE_LIFE_MODULE_IDS = [
	'health',
	'insurance',
	'vehicles',
	'identity',
] as const

export const COMING_SOON_MODULE_IDS = [
	'property',
	'finance',
	'travel',
	'education',
	'employment',
] as const

/** @deprecated Use COMING_SOON_MODULE_IDS */
export const MORE_COMING_SOON_MODULE_IDS = COMING_SOON_MODULE_IDS

/** @deprecated Use COMING_SOON_MODULE_IDS */
export const DASHBOARD_COMING_SOON_MODULE_IDS = COMING_SOON_MODULE_IDS

export const MODULE_ROUTES: Partial<Record<string, string>> = {
	health: ROUTES.health,
	insurance: ROUTES.insurance,
	vehicles: ROUTES.vehicles,
	personal: ROUTES.personal,
	identity: ROUTES.identity,
	documents: ROUTES.documents,
	modules: ROUTES.modules,
	family: ROUTES.profileFamily,
	timeline: ROUTES.timeline,
}

export function getModuleById(id: string): ModuleDefinition | undefined {
	return MODULE_REGISTRY.find((module) => module.id === id)
}

export function getLifeModuleById(id: string): ModuleDefinition | undefined {
	return LIFE_MODULE_REGISTRY.find((module) => module.id === id)
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

export function getLifeModulesByStatus(
	status: ModuleStatus,
): ModuleDefinition[] {
	return LIFE_MODULE_REGISTRY.filter((module) => module.status === status)
}

/** Modules shown in the hub primary section. */
export function getHubPrimaryModules(): ModuleDefinition[] {
	return HUB_PRIMARY_MODULE_IDS.map((id) => getLifeModuleById(id)).filter(
		(module): module is ModuleDefinition => module !== undefined,
	)
}

/** Secondary hub modules (e.g. Personal). */
export function getHubSecondaryModules(): ModuleDefinition[] {
	return HUB_AVAILABLE_MODULE_IDS.filter(
		(id) =>
			!HUB_PRIMARY_MODULE_IDS.includes(
				id as (typeof HUB_PRIMARY_MODULE_IDS)[number],
			),
	)
		.map((id) => getLifeModuleById(id))
		.filter((module): module is ModuleDefinition => module !== undefined)
}

export function getHubComingSoonModules(): ModuleDefinition[] {
	return COMING_SOON_MODULE_IDS.map((id) => getLifeModuleById(id)).filter(
		(module): module is ModuleDefinition => module !== undefined,
	)
}

/** Navigable life modules (status available with a route). */
export function getAvailableLifeModules(): ModuleDefinition[] {
	return LIFE_MODULE_REGISTRY.filter(
		(module) => module.status === 'available' && Boolean(module.route),
	)
}

export function getActiveLifeModules(): ModuleDefinition[] {
	return ACTIVE_LIFE_MODULE_IDS.map((id) => getLifeModuleById(id)).filter(
		(module): module is ModuleDefinition => module !== undefined,
	)
}

export function getComingSoonModules(): ModuleDefinition[] {
	return getHubComingSoonModules()
}

/** @deprecated Use getHubComingSoonModules */
export function getMoreComingSoonModules(): ModuleDefinition[] {
	return getComingSoonModules()
}

export const EXPLORE_CAPABILITY_IDS = [
	...HUB_AVAILABLE_MODULE_IDS,
	'documents',
	...COMING_SOON_MODULE_IDS,
] as const

export function getExploreCapabilities(): ModuleDefinition[] {
	return EXPLORE_CAPABILITY_IDS.map((id) => getModuleById(id)).filter(
		(module): module is ModuleDefinition => module !== undefined,
	)
}

export function isModuleNavigable(module: ModuleDefinition): boolean {
	return module.status === 'available' && Boolean(module.route)
}
