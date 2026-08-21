import type { User } from '@supabase/supabase-js'
import { buildUserProfile } from '@/features/user/services/user-profile'
import { supabase } from '@/lib/supabase'
import { QA_USER_ID } from '@/qa/qa-constants'
import { isQaModeEnabled } from '@/qa/qa-mode'

export async function syncUserProfile(user: User): Promise<User> {
	if (isQaModeEnabled() && user.id === QA_USER_ID) {
		return user
	}

	const profile = buildUserProfile(user)
	const metadata = user.user_metadata ?? {}

	const needsUpdate =
		metadata.full_name !== profile.name ||
		metadata.avatar_url !== profile.avatarUrl ||
		metadata.email !== profile.email ||
		typeof metadata.profile_synced_at !== 'string'

	if (!needsUpdate) {
		return user
	}

	const { data, error } = await supabase.auth.updateUser({
		data: {
			...metadata,
			full_name: profile.name,
			avatar_url: profile.avatarUrl,
			email: profile.email,
			profile_synced_at: new Date().toISOString(),
		},
	})

	if (error) {
		console.error('Failed to sync user profile:', error.message)
		return user
	}

	return data.user ?? user
}
