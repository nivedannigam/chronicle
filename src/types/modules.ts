import type { LucideIcon } from 'lucide-react'

export interface ModuleDefinition {
	id: string
	name: string
	icon: LucideIcon
	enabled: boolean
	comingSoon: boolean
	color?: string
	description?: string
	route?: string
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
