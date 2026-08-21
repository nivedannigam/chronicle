export { ModulesPage } from '@/features/modules/components/ModulesPage'
export { useModuleHubCards } from '@/features/modules/hooks/useModuleHubCards'
export {
	buildHealthHubCard,
	buildInsuranceHubCard,
	buildVehiclesHubCard,
	buildIdentityHubCard,
	buildFinanceHubCard,
	buildPropertyHubCard,
	MODULE_SETUP_ROUTES,
	resolveModuleHubCardAction,
} from '@/features/modules/services/module-hub-status.service'
export type {
	ModuleHubCardState,
	ModuleHubCardViewModel,
} from '@/features/modules/types/module-hub.types'
export {
	MODULE_BACK_LABEL,
	MODULE_LIFECYCLE_ALIASES,
	MODULE_SETTINGS_SECTIONS,
	MODULE_UX_COPY,
	PLATFORM_SURFACES,
	moduleAttentionCountMessage,
	moduleEmptyMessage,
	moduleOrganizingMessage,
} from '@/features/modules/contracts/module-ux.contract'
export type { ModuleLifecycleState } from '@/features/modules/contracts/module-ux.contract'
