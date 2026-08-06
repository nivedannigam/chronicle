import { initializeRelationshipPlatform } from '@/core/relationship/bootstrap/initialize-relationship-platform'
import { registerPlatformModules } from '@/core/platform/bootstrap/register-modules'
import '@/core/platform/bootstrap/register-knowledge-providers'
import '@/core/platform/bootstrap/register-timeline-providers'

let initialized = false

/** Idempotent platform bootstrap — safe to call from app entry and tests. */
export function initializePlatform(): void {
	if (initialized) {
		return
	}

	initialized = true
	registerPlatformModules()
	initializeRelationshipPlatform()
}

/** Test helper — resets bootstrap guard without clearing registries. */
export function resetPlatformBootstrapGuard(): void {
	initialized = false
}

export function isPlatformInitialized(): boolean {
	return initialized
}
