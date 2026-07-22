import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/features/user/types'

export function buildUserProfile(user: User): UserProfile {
	const metadata = user.user_metadata ?? {}
	const name =
		(typeof metadata.full_name === 'string' && metadata.full_name) ||
		(typeof metadata.name === 'string' && metadata.name) ||
		user.email?.split('@')[0] ||
		'User'
	const email = user.email ?? ''
	const avatarUrl =
		(typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
		(typeof metadata.picture === 'string' && metadata.picture) ||
		null

	return {
		name,
		email,
		avatarUrl,
		initial: name.charAt(0).toUpperCase(),
	}
}
