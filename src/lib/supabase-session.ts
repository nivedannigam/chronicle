import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export class SupabaseAuthRequiredError extends Error {
	constructor(message = 'Authentication required. Sign in again.') {
		super(message)
		this.name = 'SupabaseAuthRequiredError'
	}
}

export async function requireSupabaseSession(): Promise<Session> {
	const { data, error } = await supabase.auth.getSession()

	if (error) {
		throw new Error(error.message)
	}

	const session = data.session

	if (!session?.access_token) {
		throw new SupabaseAuthRequiredError()
	}

	return session
}

export function isUnauthorizedSupabaseError(error: unknown): boolean {
	if (!error || typeof error !== 'object') {
		return false
	}

	const code = 'code' in error ? String(error.code) : ''
	const message = 'message' in error ? String(error.message) : ''
	const status = 'status' in error ? Number(error.status) : 0

	return (
		status === 401 ||
		code === 'PGRST301' ||
		message.includes('401') ||
		message.toLowerCase().includes('jwt') ||
		message.toLowerCase().includes('not authenticated')
	)
}
