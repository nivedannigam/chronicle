import { ROUTES } from '@/constants/routes'
import { buildAppUrl } from '@/lib/app-url'
import { logConnectorRequest } from '@/features/connectors/services/connector-request-logger'
import { supabase } from '@/lib/supabase'

const DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.readonly'
const DRIVE_SCOPE_LIST = [DRIVE_SCOPES]

export interface GoogleDriveOAuthSession {
	accessToken: string | null
	refreshToken: string | null
}

export interface FinalizeGoogleDriveConnectionResult {
	success: boolean
	connected: boolean
	googleEmail?: string | null
	provider?: string
	error?: string
}

export interface VerifyGoogleDriveConnectionResult {
	connected: boolean
	googleEmail: string | null
	connectedAt: string | null
	error?: string
}

export async function connectGoogleDriveIncremental(): Promise<void> {
	const redirectTo = buildAppUrl(ROUTES.profileConnectionsDrive)

	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo,
			scopes: DRIVE_SCOPES,
			queryParams: {
				access_type: 'offline',
				prompt: 'consent',
				include_granted_scopes: 'true',
			},
		},
	})

	if (error) {
		throw new Error(error.message)
	}

	if (data?.url) {
		window.location.assign(data.url)
	}
}

export async function getGoogleOAuthSession(
	sessionOverride?: {
		provider_token?: string | null
		provider_refresh_token?: string | null
	} | null,
): Promise<GoogleDriveOAuthSession> {
	if (sessionOverride) {
		return {
			accessToken: sessionOverride.provider_token ?? null,
			refreshToken: sessionOverride.provider_refresh_token ?? null,
		}
	}

	const { data, error } = await supabase.auth.getSession()

	if (error) {
		throw new Error(error.message)
	}

	return {
		accessToken: data.session?.provider_token ?? null,
		refreshToken: data.session?.provider_refresh_token ?? null,
	}
}

export async function finalizeGoogleDriveConnection(
	userId: string,
	sessionOverride?: {
		provider_token?: string | null
		provider_refresh_token?: string | null
	} | null,
): Promise<FinalizeGoogleDriveConnectionResult> {
	const { accessToken, refreshToken } =
		await getGoogleOAuthSession(sessionOverride)

	if (!accessToken) {
		return {
			success: false,
			connected: false,
		}
	}

	logConnectorRequest(
		'google-drive-auth.finalizeGoogleDriveConnection',
		'drive-connector',
		'action=connect',
	)

	const { data, error } = await supabase.functions.invoke('drive-connector', {
		body: {
			action: 'connect',
			userId,
			accessToken,
			refreshToken,
			scopes: DRIVE_SCOPE_LIST,
		},
	})

	if (error) {
		throw new Error(error.message)
	}

	const result = data as FinalizeGoogleDriveConnectionResult

	if (!result.success || !result.connected) {
		throw new Error(result.error ?? 'Google Drive connection failed')
	}

	return result
}

export async function verifyGoogleDriveConnection(
	userId: string,
): Promise<VerifyGoogleDriveConnectionResult> {
	const { data, error } = await supabase.functions.invoke('drive-connector', {
		body: {
			action: 'verify',
			userId,
		},
	})

	if (error) {
		throw new Error(error.message)
	}

	return data as VerifyGoogleDriveConnectionResult
}

export async function disconnectGoogleDrive(userId: string): Promise<void> {
	const { data, error } = await supabase.functions.invoke('drive-connector', {
		body: { action: 'disconnect', userId },
	})

	if (error) {
		throw new Error(error.message)
	}

	const result = data as { success?: boolean; error?: string }

	if (!result.success) {
		throw new Error(result.error ?? 'Failed to disconnect Google Drive')
	}
}
