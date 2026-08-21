import { useMemo, useSyncExternalStore } from 'react'
import {
	readIdentityPreferences,
	type IdentityPreferences,
} from '@/features/identity-knowledge/services/identity-preferences.service'

const DEFAULT_PREFERENCES: IdentityPreferences = {
	maskDocumentNumbers: true,
	hideSensitiveTimelinePreviews: true,
}

function subscribe(onStoreChange: () => void): () => void {
	if (typeof window === 'undefined') {
		return () => {}
	}

	window.addEventListener('storage', onStoreChange)
	return () => window.removeEventListener('storage', onStoreChange)
}

export function useIdentityPreferences(
	userId: string | undefined,
): IdentityPreferences {
	const snapshot = useSyncExternalStore(
		subscribe,
		() => (userId ? JSON.stringify(readIdentityPreferences(userId)) : ''),
		() => '',
	)

	return useMemo(() => {
		if (!userId) {
			return DEFAULT_PREFERENCES
		}

		return readIdentityPreferences(userId)
	}, [snapshot, userId])
}
