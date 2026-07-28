import { ROUTES } from '@/constants/routes'
import { supabase } from '@/lib/supabase'

function authRedirectUrl(path = ROUTES.authCallback): string {
	return `${window.location.origin}${path}`
}

export async function signInWithGoogle() {
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: authRedirectUrl(),
			queryParams: {
				prompt: 'select_account',
			},
		},
	})

	if (error) {
		throw error
	}

	// Explicit navigation — required for some in-app browsers and PWAs.
	if (data?.url) {
		window.location.assign(data.url)
	}
}

export async function signOut() {
	const { error } = await supabase.auth.signOut()

	if (error) {
		throw error
	}
}
