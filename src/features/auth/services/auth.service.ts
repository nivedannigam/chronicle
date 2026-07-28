import { ROUTES } from '@/constants/routes'
import { clearAllAskSessionsForUser } from '@/features/ask/services/ask-session.service'
import { buildAppUrl } from '@/lib/app-url'
import { supabase } from '@/lib/supabase'

export async function signInWithGoogle() {
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			// Always return to the canonical domain so OAuth does not hop between Vercel aliases.
			redirectTo: buildAppUrl(ROUTES.authCallback),
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
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (user?.id) {
		clearAllAskSessionsForUser(user.id)
	}

	const { error } = await supabase.auth.signOut()

	if (error) {
		throw error
	}
}
