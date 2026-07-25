import { useCallback, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useFamilyContext } from '@/features/family/context/FamilyContext'
import {
	loadLocalPersonalPreferences,
	mergePersonalPreferences,
	parsePersonalPreferences,
	personalPreferencesToRecord,
	saveLocalPersonalPreferences,
} from '@/features/personalization/services/personal-preferences.service'
import { savePersonalPreferences } from '@/features/family/services/family-platform.service'
import type { ChroniclePersonalPreferences } from '@/features/personalization/types/personal-context.types'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { queryKeys } from '@/lib/query-keys'

export function usePersonalPreferences() {
	const { user } = useAuth()
	const userId = user?.id ?? ''
	const { family, personalPreferences, refresh } = useFamilyContext()
	const queryClient = useQueryClient()

	const preferences = useMemo(() => {
		const local = loadLocalPersonalPreferences(userId)
		return mergePersonalPreferences(
			personalPreferencesToRecord(personalPreferences),
			local,
		)
	}, [personalPreferences, userId])

	const updatePreferences = useCallback(
		async (patch: Partial<ChroniclePersonalPreferences>) => {
			if (!userId) {
				return
			}

			const next: ChroniclePersonalPreferences = {
				...preferences,
				...patch,
				notificationPreferences: {
					...preferences.notificationPreferences,
					...patch.notificationPreferences,
				},
			}

			saveLocalPersonalPreferences(userId, next)

			if (family) {
				await savePersonalPreferences({
					userId,
					familyId: family.id,
					preferences: personalPreferencesToRecord(next),
				})
				await refresh()
				await queryClient.invalidateQueries({
					queryKey: queryKeys.family.context(userId),
				})
			}
		},
		[preferences, userId, family, refresh, queryClient],
	)

	return {
		preferences,
		updatePreferences,
	}
}

export function useResolvedPersonalPreferences(
	remotePreferences: Record<string, unknown> | undefined,
	userId: string,
): ChroniclePersonalPreferences {
	return useMemo(() => {
		const local = loadLocalPersonalPreferences(userId)
		return mergePersonalPreferences(remotePreferences, local)
	}, [remotePreferences, userId])
}

export { parsePersonalPreferences }
