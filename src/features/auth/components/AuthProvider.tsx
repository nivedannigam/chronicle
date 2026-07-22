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

export function AuthProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<Session | null>(null)
	const [user, setUser] = useState<User | null>(null)
	const [profile, setProfile] = useState<UserProfile | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		let cancelled = false

		const applySession = async (nextSession: Session | null) => {
			setSession(nextSession)

			const currentUser = nextSession?.user ?? null

			if (!currentUser) {
				setUser(null)
				setProfile(null)
				setIsLoading(false)
				return
			}

			setUser(currentUser)
			setProfile(buildUserProfile(currentUser))
			setIsLoading(false)

			const resolved = await resolveUser(nextSession)

			if (cancelled) {
				return
			}

			setUser(resolved.user)
			setProfile(resolved.profile)
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
