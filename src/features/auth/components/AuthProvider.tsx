import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { AuthContext } from '@/features/auth/components/auth-context'
import {
	signInWithGoogle as signInWithGoogleService,
	signOut as signOutService,
} from '@/features/auth/services/auth.service'
import { buildUserProfile } from '@/features/user/services/user-profile'
import { syncUserProfile } from '@/features/user/services/user.service'
import type { UserProfile } from '@/features/user/types'
import { supabase } from '@/lib/supabase'
import { getQaSessionUser, isQaModeEnabled } from '@/qa/qa-mode'
import { getQaDataset } from '@/qa/qa-repository'

interface AuthState {
	session: Session | null
	user: User | null
	profile: UserProfile | null
	isLoading: boolean
}

async function resolveUser(session: Session | null) {
	const currentUser = session?.user ?? null

	if (!currentUser) {
		return { user: null, profile: null }
	}

	const syncedUser = await syncUserProfile(currentUser)

	return {
		user: syncedUser,
		profile: buildUserProfile(syncedUser),
	}
}

function createInitialAuthState(): AuthState {
	if (isQaModeEnabled()) {
		getQaDataset()
		const qaUser = getQaSessionUser()
		const qaSession = {
			access_token: 'qa-access-token',
			refresh_token: 'qa-refresh-token',
			expires_in: 3600,
			expires_at: Math.floor(Date.now() / 1000) + 3600,
			token_type: 'bearer',
			user: qaUser,
		} as Session

		return {
			session: qaSession,
			user: qaUser as User,
			profile: buildUserProfile(qaUser as User),
			isLoading: false,
		}
	}

	return {
		session: null,
		user: null,
		profile: null,
		isLoading: true,
	}
}

export function AuthProvider({ children }: { children: ReactNode }) {
	const [authState, setAuthState] = useState(createInitialAuthState)
	const { session, user, profile, isLoading } = authState

	useEffect(() => {
		if (isQaModeEnabled()) {
			return
		}

		let cancelled = false

		const applySession = async (nextSession: Session | null) => {
			const currentUser = nextSession?.user ?? null

			if (!currentUser) {
				setAuthState({
					session: nextSession,
					user: null,
					profile: null,
					isLoading: false,
				})
				return
			}

			setAuthState({
				session: nextSession,
				user: currentUser,
				profile: buildUserProfile(currentUser),
				isLoading: false,
			})

			const resolved = await resolveUser(nextSession)

			if (cancelled) {
				return
			}

			setAuthState({
				session: nextSession,
				user: resolved.user,
				profile: resolved.profile,
				isLoading: false,
			})
		}

		supabase.auth.getSession().then(({ data: { session } }) => {
			void applySession(session)
		})

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			void applySession(session)
		})

		return () => {
			cancelled = true
			subscription.unsubscribe()
		}
	}, [])

	const signInWithGoogle = useCallback(async () => {
		await signInWithGoogleService()
	}, [])

	const signOut = useCallback(async () => {
		await signOutService()
	}, [])

	return (
		<AuthContext.Provider
			value={{
				session,
				user,
				profile,
				isLoading,
				signInWithGoogle,
				signOut,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}
