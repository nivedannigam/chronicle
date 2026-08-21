export * from '@/core/platform/contracts'
export * from '@/core/platform/registries'
export * from '@/core/platform/bootstrap'
export { buildPlatformIntelligenceSources } from '@/core/platform/services/intelligence-sources.builder'
export {
	runPlatformIntegrityAudit,
	runModuleDocumentIntegrityAudit,
	formatPlatformIntegrityAuditReport,
	type PlatformIntegrityAuditResult,
	type ModuleDocumentIntegrityResult,
	type PlatformModuleId,
} from '@/core/platform/services/platform-integrity-audit.service'
