import { ROUTES } from '@/constants/routes'

/** Canonical production origin — set VITE_APP_URL in Vercel env vars. */
export function getCanonicalAppOrigin(): string {
	const configured = import.meta.env.VITE_APP_URL?.trim()

	if (configured) {
		try {
			return new URL(configured).origin
		} catch {
			// Fall through to runtime origin.
		}
	}

	if (typeof window !== 'undefined') {
		return window.location.origin
	}

	return ''
}

export function buildAppUrl(path = ROUTES.root): string {
	const origin = getCanonicalAppOrigin()
	return `${origin}${path.startsWith('/') ? path : `/${path}`}`
}

/** Redirect alternate Vercel preview URLs to the canonical domain (avoids double OAuth). */
export function redirectToCanonicalOriginIfNeeded(): void {
	if (!import.meta.env.PROD || typeof window === 'undefined') {
		return
	}

	const canonical = import.meta.env.VITE_APP_URL?.trim()
	if (!canonical) return

	let canonicalOrigin: string
	try {
		canonicalOrigin = new URL(canonical).origin
	} catch {
		return
	}

	if (window.location.origin === canonicalOrigin) return

	const target = `${canonicalOrigin}${window.location.pathname}${window.location.search}${window.location.hash}`
	window.location.replace(target)
}
