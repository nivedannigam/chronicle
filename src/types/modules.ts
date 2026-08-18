import type { LucideIcon } from 'lucide-react'

export type ModuleStatus = 'available' | 'building' | 'coming_soon'

export type ModuleCategory = 'life' | 'shell'

export interface ModuleDefinition {
	id: string
	name: string
	description: string
	icon: LucideIcon
	status: ModuleStatus
	category: ModuleCategory
	route?: string
	color?: string
	/** @deprecated Use status === 'available' */
	enabled?: boolean
	/** @deprecated Use status === 'coming_soon' */
	comingSoon?: boolean
}

export interface SettingsItem {
	Icon: LucideIcon
	label: string
	sub: string
}

/** @deprecated Use ModuleDefinition from the module registry */
export interface ModuleItem {
	Icon: LucideIcon
	label: string
	color?: string
}
