import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export class SupabaseAuthRequiredError extends Error {
	constructor(message = 'Authentication required. Sign in again.') {
		super(message)
		this.name = 'SupabaseAuthRequiredError'
	}
}

export interface AskAiAuthDiagnostics {
	currentUser: Pick<User, 'id' | 'email'> | null
	sessionExists: boolean
	accessTokenExists: boolean
	authorizationHeaderWillBeSent: boolean
}

export async function getAskAiAuthDiagnostics(): Promise<AskAiAuthDiagnostics> {
	const {
		data: { user },
	} = await supabase.auth.getUser()
	const { data: sessionData } = await supabase.auth.getSession()
	const session = sessionData.session

	return {
		currentUser: user
			? {
					id: user.id,
					email: user.email,
				}
			: null,
		sessionExists: Boolean(session),
		accessTokenExists: Boolean(session?.access_token),
		authorizationHeaderWillBeSent: Boolean(session?.access_token),
	}
}

export async function requireSupabaseSession(): Promise<Session> {
	const {
		data: { user },
		error: userError,
	} = await supabase.auth.getUser()

	if (userError) {
		throw new Error(userError.message)
	}

	const { data, error } = await supabase.auth.getSession()

	if (error) {
		throw new Error(error.message)
	}

	const session = data.session

	if (!user || !session?.access_token) {
		throw new SupabaseAuthRequiredError()
	}

	if (session.user.id !== user.id) {
		throw new SupabaseAuthRequiredError('Session user mismatch. Sign in again.')
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
		message.toLowerCase().includes('not authenticated') ||
		message.toLowerCase().includes('unauthorized')
	)
}
