/**
 * Privacy Scope Contract
 *
 * Every canonical fact, document, and entity must declare unambiguous scope.
 * Surfaces must filter using stable familyMemberId — never display-name matching.
 */

/** Who may see a scoped resource. */
export type PrivacyScope = 'member' | 'shared' | 'account'

/** Minimum fields required for privacy filtering. */
export interface PrivacyScopedResource {
	familyMemberId: string | null
	privacyScope?: PrivacyScope
}

export function resolveResourcePrivacyScope(
	resource: PrivacyScopedResource,
): PrivacyScope {
	if (resource.privacyScope) {
		return resource.privacyScope
	}

	if (resource.familyMemberId) {
		return 'member'
	}

	return 'account'
}
