import {
	Activity,
	Calendar,
	Car,
	CheckSquare,
	DollarSign,
	FileText,
	Home,
	Image,
	Mail,
	Plane,
	Settings2,
	Sparkles,
	Wifi,
} from 'lucide-react'
import { C } from '@/constants/colors'
import { ROUTES } from '@/constants/routes'
import type { ModuleDefinition } from '@/types/modules'

export const MODULE_REGISTRY: ModuleDefinition[] = [
	{
		id: 'home',
		name: 'Home',
		icon: Home,
		enabled: true,
		comingSoon: false,
	},
	{
		id: 'ask',
		name: 'Ask',
		icon: Sparkles,
		enabled: true,
		comingSoon: false,
	},
	{
		id: 'mail',
		name: 'Mail',
		icon: Mail,
		enabled: true,
		comingSoon: false,
		color: C.accentBlue,
	},
	{
		id: 'tasks',
		name: 'Tasks',
		icon: CheckSquare,
		enabled: true,
		comingSoon: false,
	},
	{
		id: 'more',
		name: 'More',
		icon: Settings2,
		enabled: true,
		comingSoon: false,
	},
	{
		id: 'health',
		name: 'Health',
		icon: Activity,
		enabled: true,
		comingSoon: false,
		color: C.teal,
	},
	{
		id: 'finance',
		name: 'Finance',
		icon: DollarSign,
		enabled: true,
		comingSoon: false,
		color: C.greenAlt,
	},
	{
		id: 'travel',
		name: 'Travel',
		icon: Plane,
		enabled: true,
		comingSoon: false,
		color: C.orange,
	},
	{
		id: 'photos',
		name: 'Photos',
		icon: Image,
		enabled: true,
		comingSoon: false,
		color: C.photos,
	},
	{
		id: 'calendar',
		name: 'Calendar',
		icon: Calendar,
		enabled: true,
		comingSoon: false,
		color: C.accentBlue,
	},
	{
		id: 'documents',
		name: 'Docs',
		icon: FileText,
		enabled: true,
		comingSoon: false,
		color: C.accent,
	},
	{
		id: 'vehicles',
		name: 'Vehicles',
		icon: Car,
		enabled: false,
		comingSoon: true,
	},
	{
		id: 'smart-home',
		name: 'Smart Home',
		icon: Wifi,
		enabled: false,
		comingSoon: true,
	},
]

const MORE_GRID_MODULE_IDS = [
	'finance',
	'travel',
	'documents',
	'photos',
	'calendar',
	'mail',
	'health',
] as const

export const MODULE_ROUTES: Partial<Record<string, string>> = {
	health: ROUTES.health,
}

export function getModuleById(id: string): ModuleDefinition | undefined {
	return MODULE_REGISTRY.find((module) => module.id === id)
}

export function getMoreGridModules(): ModuleDefinition[] {
	return MORE_GRID_MODULE_IDS.map((id) => getModuleById(id)).filter(
		(module): module is ModuleDefinition => module !== undefined,
	)
}

export function getComingSoonModules(): ModuleDefinition[] {
	return MODULE_REGISTRY.filter((module) => module.comingSoon)
}
