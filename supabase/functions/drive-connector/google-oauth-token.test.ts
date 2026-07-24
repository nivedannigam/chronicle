import { describe, expect, it, vi } from 'vitest'
import {
	computeTokenExpiresAt,
	evaluateTokenState,
	GoogleAuthExpiredError,
	GOOGLE_AUTH_EXPIRED_MESSAGE,
	isAccessTokenExpired,
	isGoogleAuthExpiredError,
	resolveGoogleAccessToken,
} from './google-oauth-token.ts'

const NOW = Date.parse('2026-07-24T00:00:00.000Z')

function tokens(
	overrides: Partial<{
		access_token: string | null
		refresh_token: string | null
		token_expires_at: string | null
	}> = {},
) {
	return {
		access_token: 'access-token',
		refresh_token: 'refresh-token',
		token_expires_at: new Date(NOW + 60 * 60 * 1000).toISOString(),
		...overrides,
	}
}

describe('isAccessTokenExpired', () => {
	it('returns true when expiry is within 5 minutes', () => {
		const expiresAt = new Date(NOW + 4 * 60 * 1000).toISOString()
		expect(isAccessTokenExpired(expiresAt, NOW)).toBe(true)
	})

	it('returns false when expiry is beyond 5 minutes', () => {
		const expiresAt = new Date(NOW + 10 * 60 * 1000).toISOString()
		expect(isAccessTokenExpired(expiresAt, NOW)).toBe(false)
	})
})

describe('evaluateTokenState', () => {
	it('marks valid token as not needing refresh', () => {
		const result = evaluateTokenState(tokens(), NOW)
		expect(result.accessTokenPresent).toBe(true)
		expect(result.refreshTokenPresent).toBe(true)
		expect(result.needsRefresh).toBe(false)
	})
})

describe('resolveGoogleAccessToken', () => {
	it('returns existing access token when still valid', async () => {
		const refreshAccessToken = vi.fn()

		const accessToken = await resolveGoogleAccessToken({
			userId: 'user-1',
			now: NOW,
			loadConnection: async () => ({
				status: 'connected',
				connector_id: 'google-drive',
			}),
			loadTokens: async () => tokens(),
			refreshAccessToken,
			persistAccessToken: vi.fn(),
		})

		expect(accessToken).toBe('access-token')
		expect(refreshAccessToken).not.toHaveBeenCalled()
	})

	it('refreshes expired token successfully', async () => {
		const persistAccessToken = vi.fn()
		const refreshAccessToken = vi.fn().mockResolvedValue({
			access_token: 'new-access-token',
			expires_in: 3600,
		})

		const accessToken = await resolveGoogleAccessToken({
			userId: 'user-1',
			now: NOW,
			loadConnection: async () => ({
				status: 'connected',
				connector_id: 'google-drive',
			}),
			loadTokens: async () =>
				tokens({
					token_expires_at: new Date(NOW - 60_000).toISOString(),
				}),
			refreshAccessToken,
			persistAccessToken,
		})

		expect(accessToken).toBe('new-access-token')
		expect(refreshAccessToken).toHaveBeenCalledWith('refresh-token')
		expect(persistAccessToken).toHaveBeenCalledWith({
			accessToken: 'new-access-token',
			expiresAt: computeTokenExpiresAt(3600, NOW),
		})
	})

	it('throws auth expired when refresh fails', async () => {
		await expect(
			resolveGoogleAccessToken({
				userId: 'user-1',
				now: NOW,
				loadConnection: async () => ({
					status: 'connected',
					connector_id: 'google-drive',
				}),
				loadTokens: async () =>
					tokens({
						token_expires_at: new Date(NOW - 60_000).toISOString(),
					}),
				refreshAccessToken: async () => {
					throw new Error('invalid_grant')
				},
				persistAccessToken: vi.fn(),
			}),
		).rejects.toThrow(GOOGLE_AUTH_EXPIRED_MESSAGE)
	})

	it('throws auth expired when refresh token is missing', async () => {
		await expect(
			resolveGoogleAccessToken({
				userId: 'user-1',
				now: NOW,
				loadConnection: async () => ({
					status: 'connected',
					connector_id: 'google-drive',
				}),
				loadTokens: async () =>
					tokens({
						refresh_token: null,
					}),
				refreshAccessToken: vi.fn(),
				persistAccessToken: vi.fn(),
			}),
		).rejects.toThrow(GoogleAuthExpiredError)

		expect(isGoogleAuthExpiredError(new GoogleAuthExpiredError())).toBe(true)
	})
})
