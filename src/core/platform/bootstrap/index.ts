export {
	initializePlatform,
	isPlatformInitialized,
	resetPlatformBootstrapGuard,
} from '@/core/platform/bootstrap/initialize-platform'
export { registerPlatformModules } from '@/core/platform/bootstrap/register-modules'

/** Prefer importing side-effect registration via initializePlatform(). */
export * from '@/core/platform/bootstrap/register-knowledge-providers'
export * from '@/core/platform/bootstrap/register-timeline-providers'
