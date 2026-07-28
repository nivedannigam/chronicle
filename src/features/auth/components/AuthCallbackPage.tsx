import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DEFAULT_AUTHENTICATED_ROUTE, ROUTES } from '@/constants/routes'
import { C } from '@/constants/colors'
import { supabase } from '@/lib/supabase'

export function AuthCallbackPage() {
	const navigate = useNavigate()

	useEffect(() => {
		let cancelled = false

		const finishAuth = async () => {
			// Supabase parses the OAuth hash/query when detectSessionInUrl is enabled.
			const { data, error } = await supabase.auth.getSession()

			if (cancelled) return

			if (error) {
				navigate(`${ROUTES.login}?error=${encodeURIComponent(error.message)}`, {
					replace: true,
				})
				return
			}

			navigate(data.session ? DEFAULT_AUTHENTICATED_ROUTE : ROUTES.login, {
				replace: true,
			})
		}

		void finishAuth()

		return () => {
			cancelled = true
		}
	}, [navigate])

	return (
		<div
			style={{
				minHeight: '100dvh',
				background: C.bg,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				padding: '32px 24px',
				paddingTop: 'calc(32px + env(safe-area-inset-top))',
				fontFamily:
					'-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
			}}
		>
			<p style={{ color: C.textSec, fontSize: 15, margin: 0 }}>
				Signing you in…
			</p>
		</div>
	)
}
