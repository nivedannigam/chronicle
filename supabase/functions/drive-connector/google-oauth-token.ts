export const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000

export const GOOGLE_AUTH_EXPIRED_MESSAGE =
	'Google authentication expired. Please reconnect Google Drive.'

export class GoogleAuthExpiredError extends Error {
	constructor(message = GOOGLE_AUTH_EXPIRED_MESSAGE) {
		super(message)
		this.name = 'GoogleAuthExpiredError'
	}
}

export interface ConnectorConnectionRow {
	status: string
	connector_id: string
	scopes?: string[]
	connected_at?: string | null
	last_error?: string | null
}

export interface ConnectorOAuthTokenRow {
	access_token: string | null
	refresh_token: string | null
	token_expires_at: string | null
	scopes?: string[]
}

export interface GoogleTokenRefreshResult {
	access_token: string
	expires_in: number
}

export interface TokenEvaluation {
	accessTokenPresent: boolean
	refreshTokenPresent: boolean
	expiresAt: string | null
	needsRefresh: boolean
}

export interface OAuthLogPayload {
	userId: string
	loadedConnector: boolean
	connectorStatus?: string
	accessTokenPresent: boolean
	refreshTokenPresent: boolean
	tokenExpiry: string | null
	refreshingToken: boolean
}

export function logOAuth(event: string, payload: Record<string, unknown>) {
	console.log(
		JSON.stringify({
			service: 'drive-connector',
			component: 'oauth',
			event,
			...payload,
		}),
	)
}

export function isAccessTokenExpired(
	expiresAt: string | null,
	now = Date.now(),
	bufferMs = TOKEN_REFRESH_BUFFER_MS,
): boolean {
	if (!expiresAt) {
		return true
	}

	const expiresAtMs = Date.parse(expiresAt)

	if (Number.isNaN(expiresAtMs)) {
		return true
	}

	return expiresAtMs <= now + bufferMs
}

export function evaluateTokenState(
	tokens: ConnectorOAuthTokenRow | null,
	now = Date.now(),
): TokenEvaluation {
	const accessTokenPresent = Boolean(tokens?.access_token)
	const refreshTokenPresent = Boolean(tokens?.refresh_token)
	const expiresAt = tokens?.token_expires_at ?? null

	return {
		accessTokenPresent,
		refreshTokenPresent,
		expiresAt,
		needsRefresh: !accessTokenPresent || isAccessTokenExpired(expiresAt, now),
	}
}

export function assertConnectorReady(
	connection: ConnectorConnectionRow | null,
	tokens: ConnectorOAuthTokenRow | null,
): void {
	if (!connection || connection.status !== 'connected') {
		throw new GoogleAuthExpiredError(
			'Google Drive is not connected. Please connect Google Drive.',
		)
	}

	if (!tokens?.refresh_token) {
		throw new GoogleAuthExpiredError()
	}

	if (!tokens.access_token && !tokens.refresh_token) {
		throw new GoogleAuthExpiredError()
	}
}

export function computeTokenExpiresAt(
	expiresInSeconds: number,
	now = Date.now(),
): string {
	return new Date(now + expiresInSeconds * 1000).toISOString()
}

export interface ResolveAccessTokenDeps {
	userId: string
	now?: number
	loadConnection: () => Promise<ConnectorConnectionRow | null>
	loadTokens: () => Promise<ConnectorOAuthTokenRow | null>
	refreshAccessToken: (
		refreshToken: string,
	) => Promise<GoogleTokenRefreshResult>
	persistAccessToken: (input: {
		accessToken: string
		expiresAt: string
		refreshToken?: string
	}) => Promise<void>
}

export async function resolveGoogleAccessToken(
	deps: ResolveAccessTokenDeps,
): Promise<string> {
	const now = deps.now ?? Date.now()
	const connection = await deps.loadConnection()
	const tokens = await deps.loadTokens()
	const evaluation = evaluateTokenState(tokens, now)

	logOAuth('token_state', {
		userId: deps.userId,
		loadedConnector: Boolean(connection),
		connectorStatus: connection?.status,
		accessTokenPresent: evaluation.accessTokenPresent,
		refreshTokenPresent: evaluation.refreshTokenPresent,
		tokenExpiry: evaluation.expiresAt,
		refreshingToken: evaluation.needsRefresh,
	})

	assertConnectorReady(connection, tokens)

	if (!evaluation.needsRefresh && tokens?.access_token) {
		return tokens.access_token
	}

	if (!tokens?.refresh_token) {
		throw new GoogleAuthExpiredError()
	}

	logOAuth('refreshing_token', {
		userId: deps.userId,
		reason: 'expired_or_missing',
	})

	try {
		const refreshed = await deps.refreshAccessToken(tokens.refresh_token)
		const expiresAt = computeTokenExpiresAt(refreshed.expires_in, now)

		await deps.persistAccessToken({
			accessToken: refreshed.access_token,
			expiresAt,
		})

		logOAuth('token_refreshed', {
			userId: deps.userId,
			tokenExpiry: expiresAt,
		})

		return refreshed.access_token
	} catch (error) {
		logOAuth('token_refresh_failed', {
			userId: deps.userId,
			error: error instanceof Error ? error.message : 'refresh failed',
		})

		throw new GoogleAuthExpiredError()
	}
}

export function isGoogleAuthExpiredError(error: unknown): boolean {
	return error instanceof GoogleAuthExpiredError
}

export function isGoogleUnauthorizedResponse(
	status: number,
	body: string,
): boolean {
	if (status === 401) {
		return true
	}

	return (
		body.includes('UNAUTHENTICATED') || body.includes('Invalid Credentials')
	)
}
