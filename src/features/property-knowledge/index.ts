export {
	buildPropertyKnowledge,
	buildPropertyHomeViewModel,
	filterPropertyKnowledgeForMember,
} from '@/features/property-knowledge/services/property-knowledge.builder'
export {
	runPropertyIntegrityAudit,
	formatPropertyIntegrityAuditReport,
} from '@/features/property-knowledge/services/property-integrity-audit.service'
export {
	PROPERTY_DOCUMENT_TYPE_REGISTRY,
	PROPERTY_TYPE_REGISTRY,
	PRIMARY_PROPERTY_DOCUMENT_TYPES,
	getPropertyDocumentTypeDefinition,
	getPropertyTypeDefinition,
	resolvePropertyDocumentTypeId,
	inferPropertyTypeId,
} from '@/features/property-knowledge/services/property-type.registry'
export {
	resolvePropertyNameFromPath,
	discoverPropertyNamesFromFolderPaths,
	slugifyPropertyName,
	isPropertyFolderPath,
} from '@/features/property-knowledge/services/property-folder-resolver'
export {
	buildPropertyEntityKey,
	mergePropertyCandidates,
	resolveOwnershipFromEvidence,
	formatOwnershipLabel,
} from '@/features/property-knowledge/services/property-entity-resolver.service'
export {
	maskPropertyIdentifier,
	maskPropertyAddressLine,
} from '@/features/property-knowledge/services/property-mask.service'
export type {
	PropertyKnowledge,
	PropertyRecord,
	PropertyDocumentRecord,
	PropertyAttentionItem,
	PropertyTimelineEvent,
	PropertyHomeViewModel,
	PropertySetupStatus,
	PropertyOwnership,
	PropertyTypeId,
	PropertyFactKey,
} from '@/features/property-knowledge/types/property-knowledge.types'
