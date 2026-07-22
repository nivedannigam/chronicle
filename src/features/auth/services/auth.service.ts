import { DEFAULT_AUTHENTICATED_ROUTE } from '@/constants/routes'
import { supabase } from '@/lib/supabase'

export async function signInWithGoogle() {
	const { error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: `${window.location.origin}${DEFAULT_AUTHENTICATED_ROUTE}`,
		},
	})

	if (error) {
		throw error
	}
}

export async function signOut() {
	const { error } = await supabase.auth.signOut()

	if (error) {
		throw error
	}
}
