import type { Session, User } from '@supabase/supabase-js'
import type { UserProfile } from '@/features/user/types'

export interface AuthContextValue {
	session: Session | null
	user: User | null
	profile: UserProfile | null
	isLoading: boolean
	signInWithGoogle: () => Promise<void>
	signOut: () => Promise<void>
}
