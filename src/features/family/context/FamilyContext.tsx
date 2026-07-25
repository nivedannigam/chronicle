import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useUser } from '@/features/user/hooks/useUser'
import {
	getMemberPreferences,
	getOrCreateFamily,
	saveSelectedMemberPreference,
} from '@/features/family/services/family-platform.service'
import { parsePersonalPreferences } from '@/features/personalization/services/personal-preferences.service'
import type { ChroniclePersonalPreferences } from '@/features/personalization/types/personal-context.types'
import { ensureDefaultFamilyMember } from '@/features/family/services/family.service'
import type {
	Family,
	FamilyMemberWithAliases,
} from '@/features/family/types/family.types'
import { getAccountOwnerMemberId } from '@/features/family/utils/member-display'
import { queryKeys, STALE_TIME } from '@/lib/query-keys'

interface FamilyContextValue {
	family: Family | null
	members: FamilyMemberWithAliases[]
	isLoading: boolean
	selectedMember: FamilyMemberWithAliases | null
	selectedMemberId: string | null
	accountOwnerMemberId: string | null
	currentUserMember: FamilyMemberWithAliases | null
	personalPreferences: ChroniclePersonalPreferences
	setSelectedMemberId: (memberId: string | null) => void
	refresh: () => Promise<void>
}

const FamilyContext = createContext<FamilyContextValue | null>(null)

async function loadFamilyContext(userId: string, profileName: string) {
	const family = await getOrCreateFamily(userId)
	const members = await ensureDefaultFamilyMember({
		userId,
		displayName: 'Me',
		profileName,
	})
	const preferences = await getMemberPreferences(userId, family.id)

	return { family, members, preferences }
}

export function FamilyProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth()
	const { profile } = useUser()
	const userId = user?.id
	const profileName = profile?.name ?? user?.email ?? undefined

	const query = useQuery({
		queryKey: queryKeys.family.context(userId),
		queryFn: () => loadFamilyContext(userId!, profileName ?? 'Me'),
		enabled: Boolean(userId),
		staleTime: STALE_TIME.familyMembers,
	})

	const members = useMemo(
		() => query.data?.members ?? [],
		[query.data?.members],
	)
	const family = query.data?.family ?? null
	const accountOwnerMemberId = useMemo(
		() => getAccountOwnerMemberId(members),
		[members],
	)

	const [selectedMemberOverrideId, setSelectedMemberOverrideId] = useState<
		string | null
	>(null)

	const defaultMemberId = useMemo(() => {
		if (!query.data) {
			return null
		}

		const preferred = query.data.preferences?.selectedMemberId
		const fallback = accountOwnerMemberId

		return preferred && members.some((member) => member.id === preferred)
			? preferred
			: fallback
	}, [query.data, members, accountOwnerMemberId])

	const selectedMemberId = selectedMemberOverrideId ?? defaultMemberId

	const setSelectedMemberId = useCallback(
		(memberId: string | null) => {
			setSelectedMemberOverrideId(memberId)

			if (!userId || !family) {
				return
			}

			void saveSelectedMemberPreference({
				userId,
				familyId: family.id,
				selectedMemberId: memberId,
			})
		},
		[userId, family],
	)

	const selectedMember = useMemo(
		() => members.find((member) => member.id === selectedMemberId) ?? null,
		[members, selectedMemberId],
	)

	const personalPreferences = useMemo(
		() => parsePersonalPreferences(query.data?.preferences?.preferences),
		[query.data?.preferences?.preferences],
	)

	const currentUserMember = useMemo(
		() => members.find((member) => member.isAccountOwner) ?? members[0] ?? null,
		[members],
	)

	const value = useMemo<FamilyContextValue>(
		() => ({
			family,
			members,
			isLoading: query.isLoading,
			selectedMember,
			selectedMemberId,
			accountOwnerMemberId,
			currentUserMember,
			personalPreferences,
			setSelectedMemberId,
			refresh: async () => {
				await query.refetch()
			},
		}),
		[
			family,
			members,
			query.isLoading,
			selectedMember,
			selectedMemberId,
			accountOwnerMemberId,
			currentUserMember,
			personalPreferences,
			setSelectedMemberId,
			query,
		],
	)

	return (
		<FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
	)
}

export function useFamilyContext() {
	const context = useContext(FamilyContext)

	if (!context) {
		throw new Error('useFamilyContext must be used within FamilyProvider')
	}

	return context
}

export function useOptionalFamilyContext() {
	return useContext(FamilyContext)
}
