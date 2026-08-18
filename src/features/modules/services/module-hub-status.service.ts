import { ROUTES } from '@/constants/routes'
import { getLifeModuleById } from '@/constants/modules'
import type { ConsumerOverallStatus } from '@/features/health/services/health-consumer-status.service'
import type { InsuranceKnowledge } from '@/features/insurance-knowledge/types/insurance-knowledge-object.types'
import type { InsuranceSetupStatus } from '@/features/insurance/hooks/useInsuranceMemberSetup'
import type { IdentitySetupStatus } from '@/features/identity-knowledge/types/identity-knowledge.types'
import type { VehicleKnowledge } from '@/features/vehicle-knowledge/types/vehicle-knowledge-object.types'
import type {
	ModuleHubCardState,
	ModuleHubCardViewModel,
	ModuleHubStatusTone,
} from '@/features/modules/types/module-hub.types'
import type { ModuleDefinition } from '@/types/modules'

export const MODULE_SETUP_ROUTES: Record<string, string> = {
	health: ROUTES.healthSettings,
	insurance: ROUTES.insuranceSettings,
	vehicles: ROUTES.vehiclesSettings,
	identity: ROUTES.identitySettings,
}

function cardFromModule(
	module: ModuleDefinition,
	overrides: Omit<
		ModuleHubCardViewModel,
		'id' | 'name' | 'description' | 'icon' | 'color' | 'route'
	>,
): ModuleHubCardViewModel {
	return {
		id: module.id,
		name: module.name,
		description: module.description,
		icon: module.icon,
		color: module.color ?? '#3B82F6',
		route: module.route ?? ROUTES.modules,
		setupRoute: MODULE_SETUP_ROUTES[module.id],
		...overrides,
	}
}

function healthStatusLine(status: ConsumerOverallStatus): {
	line: string
	state: ModuleHubCardState
	tone: ModuleHubStatusTone
} {
	switch (status) {
		case 'Excellent':
			return { line: 'Up to date', state: 'active', tone: 'positive' }
		case 'Good':
			return { line: 'All looking good', state: 'active', tone: 'positive' }
		case 'Monitor':
			return {
				line: 'A few areas to watch',
				state: 'attention',
				tone: 'attention',
			}
		case 'Needs Attention':
			return {
				line: 'Some results need attention',
				state: 'attention',
				tone: 'attention',
			}
		case 'Still Learning':
		default:
			return { line: 'Add your health records', state: 'empty', tone: 'muted' }
	}
}

export function buildHealthHubCard(input: {
	overallStatus: ConsumerOverallStatus
	hasReports: boolean
	isOrganizing: boolean
	hasFolderForMember: boolean
	driveConnected: boolean
}): ModuleHubCardViewModel {
	const module = getLifeModuleById('health')!

	if (input.isOrganizing) {
		return cardFromModule(module, {
			state: 'organizing',
			statusLine: 'Still organizing your health records…',
			statusTone: 'muted',
		})
	}

	if (!input.hasReports) {
		if (!input.driveConnected || !input.hasFolderForMember) {
			return cardFromModule(module, {
				state: 'setup_required',
				statusLine: 'Connect your health folder',
				actionLabel: 'Set up',
				statusTone: 'muted',
			})
		}

		return cardFromModule(module, {
			state: 'empty',
			statusLine: 'Add your health records',
			actionLabel: 'Get started',
			statusTone: 'muted',
		})
	}

	const status = healthStatusLine(input.overallStatus)

	return cardFromModule(module, {
		state: status.state,
		statusLine: status.line,
		statusTone: status.tone,
	})
}

export function buildInsuranceHubCard(input: {
	knowledge: InsuranceKnowledge | null
	setupStatus: InsuranceSetupStatus
}): ModuleHubCardViewModel {
	const module = getLifeModuleById('insurance')!

	switch (input.setupStatus) {
		case 'connect_drive':
			return cardFromModule(module, {
				state: 'setup_required',
				statusLine: 'Connect Google Drive to begin',
				actionLabel: 'Set up',
				statusTone: 'muted',
			})
		case 'assign_folder':
			return cardFromModule(module, {
				state: 'setup_required',
				statusLine: 'Connect your insurance folder',
				actionLabel: 'Set up',
				statusTone: 'muted',
			})
		case 'scanning':
		case 'processing':
			return cardFromModule(module, {
				state: 'organizing',
				statusLine: 'Organizing your policies…',
				statusTone: 'muted',
			})
		default:
			break
	}

	const knowledge = input.knowledge
	const policyCount = knowledge?.summary.policyCount ?? 0
	const expiringCount = knowledge?.summary.expiringCount ?? 0

	if (policyCount === 0) {
		if (input.setupStatus === 'empty_folder') {
			return cardFromModule(module, {
				state: 'empty',
				statusLine: 'Keep your policies in one place',
				statusTone: 'muted',
			})
		}

		return cardFromModule(module, {
			state: 'empty',
			statusLine: 'Keep your policies in one place',
			statusTone: 'muted',
		})
	}

	if (expiringCount > 0) {
		return cardFromModule(module, {
			state: 'attention',
			statusLine: `${policyCount} polic${policyCount === 1 ? 'y' : 'ies'} · ${expiringCount} renewal${expiringCount === 1 ? '' : 's'} coming up`,
			statusTone: 'attention',
		})
	}

	const headline = knowledge?.summary.headline?.trim()

	return cardFromModule(module, {
		state: 'active',
		statusLine:
			headline && headline.length <= 48
				? headline
				: `${policyCount} polic${policyCount === 1 ? 'y' : 'ies'} · All up to date`,
		statusTone: 'positive',
	})
}

export function buildVehiclesHubCard(input: {
	knowledge: VehicleKnowledge | null
	hasFolderAssigned: boolean
	isProcessing: boolean
}): ModuleHubCardViewModel {
	const module = getLifeModuleById('vehicles')!

	if (!input.hasFolderAssigned) {
		return cardFromModule(module, {
			state: 'setup_required',
			statusLine: 'Connect your Vehicles folder',
			actionLabel: 'Set up',
			statusTone: 'muted',
		})
	}

	if (input.isProcessing || (input.knowledge && !input.knowledge.hasVehicles)) {
		return cardFromModule(module, {
			state: 'organizing',
			statusLine: 'Organizing your vehicle documents…',
			statusTone: 'muted',
		})
	}

	const knowledge = input.knowledge
	const attentionCount = knowledge?.attention.length ?? 0

	if (attentionCount > 0) {
		const firstVehicle = knowledge?.vehicles[0]
		const prefix = firstVehicle ? `${firstVehicle.displayName} · ` : ''

		return cardFromModule(module, {
			state: 'attention',
			statusLine: `${prefix}${attentionCount} item${attentionCount === 1 ? '' : 's'} need attention`,
			statusTone: 'attention',
		})
	}

	if (!knowledge?.hasVehicles) {
		return cardFromModule(module, {
			state: 'empty',
			statusLine: 'Keep your cars and documents together',
			statusTone: 'muted',
		})
	}

	const vehicleCount = knowledge.vehicles.length
	const primaryVehicle = knowledge.vehicles[0]

	if (vehicleCount === 1 && primaryVehicle) {
		return cardFromModule(module, {
			state: 'active',
			statusLine: `${primaryVehicle.displayName} · All up to date`,
			statusTone: 'positive',
		})
	}

	const headline = knowledge.summary.headline?.trim()

	return cardFromModule(module, {
		state: 'active',
		statusLine:
			headline && headline.length <= 48
				? headline
				: `${vehicleCount} vehicles · All up to date`,
		statusTone: 'positive',
	})
}

export function buildIdentityHubCard(input: {
	setupStatus: IdentitySetupStatus
	attentionCount: number
	statusHeadline?: string | null
}): ModuleHubCardViewModel {
	const module = getLifeModuleById('identity')!

	switch (input.setupStatus) {
		case 'not_connected':
			return cardFromModule(module, {
				state: 'setup_required',
				statusLine: 'Connect your Identity folder',
				actionLabel: 'Set up',
				statusTone: 'muted',
			})
		case 'scanning':
			return cardFromModule(module, {
				state: 'organizing',
				statusLine: 'Looking for identity documents…',
				statusTone: 'muted',
			})
		case 'organizing':
			return cardFromModule(module, {
				state: 'organizing',
				statusLine: 'Still organizing your documents',
				statusTone: 'muted',
			})
		case 'empty':
			return cardFromModule(module, {
				state: 'empty',
				statusLine: 'No identity documents found yet',
				statusTone: 'muted',
			})
		default:
			break
	}

	if (input.attentionCount > 0) {
		return cardFromModule(module, {
			state: 'attention',
			statusLine: `${input.attentionCount} document${input.attentionCount === 1 ? '' : 's'} need attention`,
			statusTone: 'attention',
		})
	}

	const headline = input.statusHeadline?.trim()

	return cardFromModule(module, {
		state: 'active',
		statusLine:
			headline && !headline.includes('Connect')
				? headline
				: 'All set for your family',
		statusTone: 'positive',
	})
}

export function buildPersonalHubCard(input: {
	documentCount: number
}): ModuleHubCardViewModel {
	const module = getLifeModuleById('personal')!

	if (input.documentCount === 0) {
		return cardFromModule(module, {
			state: 'empty',
			statusLine: 'Your personal documents will appear here',
			statusTone: 'muted',
		})
	}

	return cardFromModule(module, {
		state: 'active',
		statusLine: 'Personal documents on file',
		statusTone: 'neutral',
	})
}

export function resolveModuleHubCardAction(card: ModuleHubCardViewModel): {
	path: string
	isSetup: boolean
} {
	if (card.state === 'setup_required' && card.setupRoute) {
		return { path: card.setupRoute, isSetup: true }
	}

	if (card.actionLabel && card.state === 'empty' && card.setupRoute) {
		return { path: card.route, isSetup: false }
	}

	return { path: card.route, isSetup: false }
}

export function isPrimaryHubModuleId(id: string): boolean {
	return (
		id === 'health' ||
		id === 'insurance' ||
		id === 'vehicles' ||
		id === 'identity'
	)
}
