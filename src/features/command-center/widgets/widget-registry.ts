import { MODULE_REGISTRY } from '@/constants/modules'
import { ROUTES } from '@/constants/routes'
import type { CommandCenterWidgetDefinition } from '@/features/command-center/types/command-center.types'

const COMMAND_CENTER_WIDGETS: Omit<
	CommandCenterWidgetDefinition,
	'isEnabled'
>[] = [
	{ id: 'attention', label: 'Attention Needed', priority: 10 },
	{ id: 'search', label: 'Search', priority: 15 },
	{ id: 'family', label: 'Family', priority: 20, moduleId: 'family' },
	{ id: 'quick-actions', label: 'Quick Actions', priority: 25 },
	{ id: 'insights', label: 'Insights', priority: 30, moduleId: 'health' },
	{ id: 'documents', label: 'Documents', priority: 40, moduleId: 'documents' },
	{
		id: 'timeline',
		label: 'Life Timeline',
		priority: 50,
		moduleId: 'timeline',
	},
	{ id: 'explore', label: 'Explore Chronicle', priority: 90 },
]

function isModuleEnabled(moduleId?: string): boolean {
	if (!moduleId) {
		return true
	}

	if (moduleId === 'family' || moduleId === 'timeline' || moduleId === 'ask') {
		return true
	}

	const module = MODULE_REGISTRY.find((entry) => entry.id === moduleId)
	return Boolean(module?.enabled && !module.comingSoon)
}

/** Returns enabled widgets sorted by priority — future modules appear when enabled in MODULE_REGISTRY. */
export function getCommandCenterWidgets(): CommandCenterWidgetDefinition[] {
	return COMMAND_CENTER_WIDGETS.map((widget) => ({
		...widget,
		isEnabled: isModuleEnabled(widget.moduleId),
	})).filter((widget) => widget.isEnabled)
}

export function getDefaultQuickActions(): import('@/features/command-center/types/command-center.types').QuickAction[] {
	const actions: import('@/features/command-center/types/command-center.types').QuickAction[] =
		[
			{
				id: 'ask',
				label: 'Ask Chronicle',
				description: 'Search everything you have shared',
				path: ROUTES.ask,
				module: 'ask',
			},
			{
				id: 'timeline',
				label: 'View timeline',
				description: 'See your family story chronologically',
				path: ROUTES.timeline,
				module: 'timeline',
			},
			{
				id: 'add-member',
				label: 'Add family member',
				description: 'Organize records by person',
				path: ROUTES.familyMemberNew,
				module: 'family',
			},
		]

	if (isModuleEnabled('health')) {
		actions.unshift({
			id: 'import-health',
			label: 'Import health reports',
			description: 'Bring lab results into Chronicle',
			path: ROUTES.healthSettings,
			module: 'health',
		})
	}

	if (isModuleEnabled('documents')) {
		actions.unshift({
			id: 'import-documents',
			label: 'Import documents',
			description: 'Upload passports, insurance, and more',
			path: ROUTES.documents,
			module: 'documents',
		})
	}

	return actions
}
