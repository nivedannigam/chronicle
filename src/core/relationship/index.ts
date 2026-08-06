export type * from '@/core/relationship/contracts'

export {
	registerRelationshipProvider,
	unregisterRelationshipProvider,
	clearRelationshipProviders,
	getRelationshipProvider,
	getRegisteredRelationshipProviders,
	getRegisteredRelationshipProviderIds,
	getRegisteredEntityTypes,
	getEntityTypesForDomain,
} from '@/core/relationship/registries/relationship-provider-registry'

export {
	resolveEntityRef,
	resolveFamilyMemberRef,
	resolvePersonRef,
	parseEntityId,
} from '@/core/relationship/services/entity-resolver.service'

export {
	resolveRelationshipType,
	invertRelationshipType,
} from '@/core/relationship/services/relationship-resolver.service'

export {
	RelationshipPlatformService,
	defaultRelationshipPlatformService,
	ingestChronicleRelationships,
	type RelationshipPlatformIngestInput,
} from '@/core/relationship/services/relationship-platform.service'

export {
	registerRelationshipProviders,
	resetRelationshipProviderRegistrationGuard,
	areRelationshipProvidersRegistered,
} from '@/core/relationship/bootstrap/register-relationship-providers'

export {
	initializeRelationshipPlatform,
	resetRelationshipPlatformBootstrapGuard,
	isRelationshipPlatformInitialized,
} from '@/core/relationship/bootstrap/initialize-relationship-platform'
