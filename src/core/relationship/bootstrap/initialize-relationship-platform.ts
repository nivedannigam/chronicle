import { registerRelationshipProviders } from '@/core/relationship/bootstrap/register-relationship-providers'

let initialized = false

/** Idempotent relationship platform bootstrap — safe to call from app entry and tests. */
export function initializeRelationshipPlatform(): void {
	if (initialized) {
		return
	}

	initialized = true
	registerRelationshipProviders()
}

export function resetRelationshipPlatformBootstrapGuard(): void {
	initialized = false
}

export function isRelationshipPlatformInitialized(): boolean {
	return initialized
}
