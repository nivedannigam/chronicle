import type { LucideIcon } from 'lucide-react'

export type ModuleHubCardState =
	'active' | 'setup_required' | 'organizing' | 'attention' | 'empty'

export type ModuleHubStatusTone = 'neutral' | 'positive' | 'attention' | 'muted'

export interface ModuleHubCardViewModel {
	id: string
	name: string
	description: string
	icon: LucideIcon
	color: string
	route: string
	setupRoute?: string
	state: ModuleHubCardState
	statusLine: string
	actionLabel?: string
	statusTone: ModuleHubStatusTone
}
