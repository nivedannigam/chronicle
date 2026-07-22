import type { User } from '@supabase/supabase-js'

export interface UserProfile {
	name: string
	email: string
	avatarUrl: string | null
	initial: string
}

export interface UserContextValue {
	user: User | null
	profile: UserProfile | null
	isLoading: boolean
}
